import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, requirePermiso } from '../auth.js'
import { config } from '../config.js'
import { enviarLinkSolicitud, enviarAvisoNuevoRegistro } from '../mailer.js'
import type { NuevaVinculacionCliente, NuevoRegistroProveedor } from '../types.js'

export const invitacionesRouter = Router()

const COLS_VC = `id, fecha, cliente, documento, telefono, direccion, tipo_persona,
                 tipo_solicitud, estado, observaciones, consecutivo, entidad, datos,
                 fecha_creacion`

function esEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

// Envia el aviso al revisor sin interrumpir el guardado si el correo falla.
async function avisarRevisor(datos: {
  consecutivo: string
  nombre: string
  entidad: 'cliente' | 'proveedor'
  actualizacion?: boolean
}): Promise<void> {
  try {
    await enviarAvisoNuevoRegistro(datos)
  } catch (err) {
    console.error('No se pudo avisar al revisor:', err)
  }
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
      const tipo =
        req.body?.tipo === 'actualizacion' ? 'actualizacion' : 'solicitud'
      const entidad =
        req.body?.entidad === 'proveedor' ? 'proveedor' : 'cliente'
      // Actualizacion: se busca el registro existente (cliente o proveedor) por
      // su correo para reenviarle el mismo formulario que diligencio, precargado.
      let solicitudId: number | null = null
      let proveedorId: number | null = null
      if (tipo === 'actualizacion') {
        if (entidad === 'proveedor') {
          const previas = await query(
            `SELECT id
               FROM registro_proveedores
              WHERE lower(COALESCE(correo, '')) = $1
                 OR lower(COALESCE(datos->>'correo', '')) = $1
              ORDER BY id DESC
              LIMIT 1`,
            [email],
          )
          const prev = previas[0] as { id: number } | undefined
          if (!prev) {
            res.status(400).json({
              error:
                'No existe un proveedor registrado con ese correo para actualizar.',
            })
            return
          }
          proveedorId = prev.id
        } else {
          const previas = await query(
            `SELECT id
               FROM vinculacion_clientes
              WHERE lower(COALESCE(datos->>'email', '')) = $1
              ORDER BY id DESC
              LIMIT 1`,
            [email],
          )
          const prev = previas[0] as { id: number } | undefined
          if (!prev) {
            res.status(400).json({
              error:
                'No existe una solicitud registrada con ese correo para actualizar.',
            })
            return
          }
          solicitudId = prev.id
        }
      }
      const token = randomBytes(24).toString('hex')
      const expira = new Date(Date.now() + config.invitacionHoras * 3600 * 1000)
      await query(
        `INSERT INTO invitaciones_solicitud (token, email, nombres, apellidos, asesor, fecha_expira, tipo, solicitud_id, entidad, proveedor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          token,
          email,
          nombres || null,
          apellidos || null,
          req.usuario!.nombre,
          expira,
          tipo,
          solicitudId,
          entidad,
          proveedorId,
        ],
      )
      const link = `${config.appUrl}/solicitud/${token}`
      try {
        await enviarLinkSolicitud(email, link, tipo, entidad)
      } catch (err) {
        // La invitacion queda creada aunque falle el correo. Respondemos 201
        // (no 502) para que ningun proxy intermedio reemplace el JSON por HTML;
        // el asesor recibe el enlace para compartirlo manualmente.
        res.status(201).json({
          email,
          nombres,
          apellidos,
          tipo,
          entidad,
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
        tipo,
        entidad,
        link,
        expira: expira.toISOString(),
        correoEnviado: true,
      })
    } catch (err) {
      next(err)
    }
  },
)

// Lista de clientes con solicitud registrada, para elegir a quien enviar un
// link de actualizacion de datos (Asesor/Admin).
invitacionesRouter.get(
  '/clientes',
  requireAuth,
  requirePermiso('enviar-solicitud'),
  async (_req, res, next) => {
    try {
      const filas = await query(
        `SELECT id, cliente, documento, consecutivo,
                COALESCE(datos->>'email', '') AS email
           FROM vinculacion_clientes
          ORDER BY cliente ASC`,
      )
      res.json(filas)
    } catch (err) {
      next(err)
    }
  },
)

// Valida un token (uso publico por el cliente).
invitacionesRouter.get('/:token', async (req, res, next) => {
  try {
    const filas = await query(
      `SELECT i.email, i.nombres, i.apellidos, i.estado, i.fecha_expira,
              i.tipo, i.solicitud_id, i.entidad, i.proveedor_id,
              v.datos AS datos_previos, v.cliente AS cliente_previo,
              p.datos AS datos_previos_prov, p.proveedor AS proveedor_previo
         FROM invitaciones_solicitud i
         LEFT JOIN vinculacion_clientes v ON v.id = i.solicitud_id
         LEFT JOIN registro_proveedores p ON p.id = i.proveedor_id
        WHERE i.token = $1`,
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
      res.status(410).json({
        error: 'Solicitud expirada. Consulte nuevamente con su asesor.',
        expirado: true,
      })
      return
    }
    const tipo = (inv.tipo as string) ?? 'solicitud'
    const entidad = (inv.entidad as string) ?? 'cliente'
    const esProveedor = entidad === 'proveedor'
    const datosPrevios =
      tipo === 'actualizacion'
        ? esProveedor
          ? (inv.datos_previos_prov ?? null)
          : (inv.datos_previos ?? null)
        : null
    res.json({
      email: inv.email,
      nombres: inv.nombres ?? '',
      apellidos: inv.apellidos ?? '',
      tipo,
      entidad,
      datosPrevios,
      clientePrevio:
        (esProveedor ? inv.proveedor_previo : inv.cliente_previo) ?? '',
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
      `SELECT id, estado, fecha_expira, tipo, solicitud_id, entidad
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
      res.status(410).json({
        error: 'Solicitud expirada. Consulte nuevamente con su asesor.',
        expirado: true,
      })
      return
    }

    const body = req.body as Partial<NuevaVinculacionCliente>
    if (!body.cliente || !body.cliente.trim()) {
      res.status(400).json({ errores: ['cliente es obligatorio'] })
      return
    }

    // Actualizacion de datos: sobrescribe la solicitud existente (no crea nueva).
    if (inv.tipo === 'actualizacion' && inv.solicitud_id) {
      const upd = await query(
        `UPDATE vinculacion_clientes
            SET fecha = COALESCE($2, fecha),
                cliente = $3,
                documento = $4,
                telefono = $5,
                direccion = $6,
                tipo_persona = $7,
                datos = $8::jsonb
          WHERE id = $1
        RETURNING consecutivo`,
        [
          inv.solicitud_id,
          body.fecha || null,
          body.cliente.trim(),
          body.documento?.trim() || null,
          body.telefono?.trim() || null,
          body.direccion?.trim() || null,
          body.tipoPersona?.trim() || null,
          JSON.stringify(body.datos ?? {}),
        ],
      )
      const consecutivo = (upd[0] as { consecutivo: string })?.consecutivo ?? ''
      await query(
        `UPDATE invitaciones_solicitud
            SET estado = 'Usada', fecha_uso = now()
          WHERE id = $1`,
        [inv.id],
      )
      await avisarRevisor({
        consecutivo,
        nombre: body.cliente.trim(),
        entidad: inv.entidad === 'proveedor' ? 'proveedor' : 'cliente',
        actualizacion: true,
      })
      res.status(201).json({ ok: true, consecutivo, actualizacion: true })
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
          tipo_solicitud, estado, observaciones, consecutivo, entidad, datos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) RETURNING ${COLS_VC}`,
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
        inv.entidad === 'proveedor' ? 'proveedor' : 'cliente',
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

    await avisarRevisor({
      consecutivo,
      nombre: body.cliente.trim(),
      entidad: inv.entidad === 'proveedor' ? 'proveedor' : 'cliente',
    })

    res.status(201).json({ ok: true, consecutivo })
  } catch (err) {
    next(err)
  }
})

// El proveedor envia su registro usando el token; crea (o actualiza) el
// registro_proveedores y marca la invitacion como usada (uso publico, un solo
// uso).
invitacionesRouter.post('/:token/proveedor', async (req, res, next) => {
  try {
    const token = req.params.token
    const filas = await query(
      `SELECT id, estado, fecha_expira, tipo, entidad, proveedor_id
         FROM invitaciones_solicitud WHERE token = $1 FOR UPDATE`,
      [token],
    )
    const inv = filas[0]
    if (!inv) {
      res.status(404).json({ error: 'Enlace no valido' })
      return
    }
    if (inv.entidad !== 'proveedor') {
      res.status(400).json({ error: 'Este enlace no es de proveedor' })
      return
    }
    if (inv.estado === 'Usada') {
      res.status(410).json({ error: 'Este enlace ya fue utilizado' })
      return
    }
    if (new Date(inv.fecha_expira as string) < new Date()) {
      res.status(410).json({
        error: 'Solicitud expirada. Consulte nuevamente con su asesor.',
        expirado: true,
      })
      return
    }

    const body = req.body as Partial<NuevoRegistroProveedor>
    if (!body.proveedor || !body.proveedor.trim()) {
      res.status(400).json({ errores: ['proveedor es obligatorio'] })
      return
    }

    // Actualizacion de datos: sobrescribe el registro existente (no crea nuevo).
    if (inv.tipo === 'actualizacion' && inv.proveedor_id) {
      const upd = await query(
        `UPDATE registro_proveedores
            SET fecha = COALESCE($2, fecha),
                proveedor = $3,
                nit = $4,
                telefono = $5,
                correo = $6,
                tipo_proveedor = $7,
                datos = $8::jsonb
          WHERE id = $1
        RETURNING consecutivo`,
        [
          inv.proveedor_id,
          body.fecha || null,
          body.proveedor.trim(),
          body.nit?.trim() || null,
          body.telefono?.trim() || null,
          body.correo?.trim() || null,
          body.tipoProveedor?.trim() || null,
          JSON.stringify(body.datos ?? {}),
        ],
      )
      const consecutivo = (upd[0] as { consecutivo: string })?.consecutivo ?? ''
      await query(
        `UPDATE invitaciones_solicitud
            SET estado = 'Usada', fecha_uso = now()
          WHERE id = $1`,
        [inv.id],
      )
      await avisarRevisor({
        consecutivo,
        nombre: body.proveedor.trim(),
        entidad: 'proveedor',
        actualizacion: true,
      })
      res.status(201).json({ ok: true, consecutivo, actualizacion: true })
      return
    }

    const seq = await query(
      `SELECT COALESCE(
                MAX(CAST(SUBSTRING(consecutivo FROM 3) AS INTEGER)), 0
              ) + 1 AS next
         FROM registro_proveedores
        WHERE consecutivo ~ '^RP[0-9]+$'`,
    )
    const next = Number((seq[0] as { next: number }).next) || 1
    const consecutivo = 'RP' + String(next).padStart(6, '0')

    const ins = await query(
      `INSERT INTO registro_proveedores
         (fecha, proveedor, nit, telefono, correo, tipo_proveedor,
          estado, observaciones, consecutivo, datos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING id`,
      [
        body.fecha || null,
        body.proveedor.trim(),
        body.nit?.trim() || null,
        body.telefono?.trim() || null,
        body.correo?.trim() || null,
        body.tipoProveedor?.trim() || null,
        body.estado?.trim() || 'Pendiente',
        body.observaciones?.trim() || null,
        consecutivo,
        JSON.stringify(body.datos ?? {}),
      ],
    )
    const proveedorId = (ins[0] as { id: number }).id

    await query(
      `UPDATE invitaciones_solicitud
          SET estado = 'Usada', fecha_uso = now(), proveedor_id = $2
        WHERE id = $1`,
      [inv.id, proveedorId],
    )

    await avisarRevisor({
      consecutivo,
      nombre: body.proveedor.trim(),
      entidad: 'proveedor',
    })

    res.status(201).json({ ok: true, consecutivo })
  } catch (err) {
    next(err)
  }
})
