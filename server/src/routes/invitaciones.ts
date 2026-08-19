import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, requirePermiso } from '../auth.js'
import { config } from '../config.js'
import { enviarLinkSolicitud } from '../mailer.js'
import type { NuevaVinculacionCliente } from '../types.js'

export const invitacionesRouter = Router()

const COLS_VC = `id, fecha, cliente, documento, telefono, direccion, tipo_persona,
                 tipo_solicitud, estado, observaciones, consecutivo, datos,
                 fecha_creacion`

function esEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

// Crea una invitacion y envia el link al correo del cliente. Solo Asesor/Admin.
invitacionesRouter.post(
  '/',
  requireAuth,
  requirePermiso('enviar-solicitud'),
  async (req, res, next) => {
    try {
      const email = ((req.body?.email as string | undefined) ?? '')
        .trim()
        .toLowerCase()
      if (!esEmail(email)) {
        res.status(400).json({ error: 'Correo electronico invalido' })
        return
      }
      const nombres = ((req.body?.nombres as string | undefined) ?? '').trim()
      const apellidos = ((req.body?.apellidos as string | undefined) ?? '').trim()
      const token = randomBytes(24).toString('hex')
      const expira = new Date(Date.now() + config.invitacionHoras * 3600 * 1000)
      await query(
        `INSERT INTO invitaciones_solicitud (token, email, nombres, apellidos, asesor, fecha_expira)
       VALUES ($1, $2, $3, $4, $5, $6)`,
        [token, email, nombres || null, apellidos || null, req.usuario!.nombre, expira],
      )
      const link = `${config.appUrl}/solicitud/${token}`
      try {
        await enviarLinkSolicitud(email, link)
      } catch (err) {
        // La invitacion queda creada aunque falle el correo. Respondemos 201
        // (no 502) para que ningun proxy intermedio reemplace el JSON por HTML;
        // el asesor recibe el enlace para compartirlo manualmente.
        res.status(201).json({
          email,
          nombres,
          apellidos,
          link,
          expira: expira.toISOString(),
          correoEnviado: false,
          aviso:
            err instanceof Error
              ? `No se pudo enviar el correo: ${err.message}. Comparte el enlace manualmente.`
              : 'No se pudo enviar el correo. Comparte el enlace manualmente.',
        })
        return
      }
      res.status(201).json({
        email,
        nombres,
        apellidos,
        link,
        expira: expira.toISOString(),
        correoEnviado: true,
      })
    } catch (err) {
      next(err)
    }
  },
)

// Valida un token (uso publico por el cliente).
invitacionesRouter.get('/:token', async (req, res, next) => {
  try {
    const filas = await query(
      `SELECT email, nombres, apellidos, estado, fecha_expira
         FROM invitaciones_solicitud WHERE token = $1`,
      [req.params.token],
    )
    const inv = filas[0]
    if (!inv) {
      res.status(404).json({ error: 'Enlace no valido' })
      return
    }
    if (inv.estado === 'Usada') {
      res.status(410).json({ error: 'Este enlace ya fue utilizado' })
      return
    }
    if (new Date(inv.fecha_expira as string) < new Date()) {
      res.status(410).json({ error: 'Este enlace ha expirado' })
      return
    }
    res.json({
      email: inv.email,
      nombres: inv.nombres ?? '',
      apellidos: inv.apellidos ?? '',
      valido: true,
    })
  } catch (err) {
    next(err)
  }
})

// El cliente envia su solicitud usando el token; crea la vinculacion y marca la
// invitacion como usada de forma atomica (uso publico, un solo uso).
invitacionesRouter.post('/:token/solicitud', async (req, res, next) => {
  try {
    const token = req.params.token
    const filas = await query(
      `SELECT id, estado, fecha_expira
         FROM invitaciones_solicitud WHERE token = $1 FOR UPDATE`,
      [token],
    )
    const inv = filas[0]
    if (!inv) {
      res.status(404).json({ error: 'Enlace no valido' })
      return
    }
    if (inv.estado === 'Usada') {
      res.status(410).json({ error: 'Este enlace ya fue utilizado' })
      return
    }
    if (new Date(inv.fecha_expira as string) < new Date()) {
      res.status(410).json({ error: 'Este enlace ha expirado' })
      return
    }

    const body = req.body as Partial<NuevaVinculacionCliente>
    if (!body.cliente || !body.cliente.trim()) {
      res.status(400).json({ errores: ['cliente es obligatorio'] })
      return
    }

    const seq = await query(
      `SELECT COALESCE(
                MAX(CAST(SUBSTRING(consecutivo FROM 3) AS INTEGER)), 0
              ) + 1 AS next
         FROM vinculacion_clientes
        WHERE consecutivo ~ '^VC[0-9]+$'`,
    )
    const next = Number((seq[0] as { next: number }).next) || 1
    const consecutivo = 'VC' + String(next).padStart(6, '0')

    const ins = await query(
      `INSERT INTO vinculacion_clientes
         (fecha, cliente, documento, telefono, direccion, tipo_persona,
          tipo_solicitud, estado, observaciones, consecutivo, datos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING ${COLS_VC}`,
      [
        body.fecha || null,
        body.cliente.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.direccion?.trim() || null,
        body.tipoPersona?.trim() || null,
        body.tipoSolicitud?.trim() || null,
        body.estado?.trim() || 'Pendiente',
        body.observaciones?.trim() || null,
        consecutivo,
        JSON.stringify(body.datos ?? {}),
      ],
    )
    const solicitudId = (ins[0] as { id: number }).id

    await query(
      `UPDATE invitaciones_solicitud
          SET estado = 'Usada', fecha_uso = now(), solicitud_id = $2
        WHERE id = $1`,
      [inv.id, solicitudId],
    )

    res.status(201).json({ ok: true, consecutivo })
  } catch (err) {
    next(err)
  }
})
