import { Router } from 'express'
import { query } from '../db.js'
import { passwordEliminarValida } from '../auth.js'
import type { NuevaVinculacionCliente, VinculacionCliente } from '../types.js'

export const vinculacionClientesRouter = Router()

function map(r: Record<string, unknown>): VinculacionCliente {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha).slice(0, 10)
        : undefined,
    cliente: r.cliente as string,
    documento: (r.documento as string | null) ?? undefined,
    telefono: (r.telefono as string | null) ?? undefined,
    direccion: (r.direccion as string | null) ?? undefined,
    tipoPersona: (r.tipo_persona as string | null) ?? undefined,
    tipoSolicitud: (r.tipo_solicitud as string | null) ?? undefined,
    estado: (r.estado as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    consecutivo: (r.consecutivo as string | null) ?? undefined,
    datos: (r.datos as Record<string, unknown> | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaVinculacionCliente>): string[] {
  const errores: string[] = []
  if (!body.cliente || !body.cliente.trim())
    errores.push('cliente es obligatorio')
  return errores
}

const COLS = `id, fecha, cliente, documento, telefono, direccion, tipo_persona,
              tipo_solicitud, estado, observaciones, consecutivo, datos,
              fecha_creacion`

vinculacionClientesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM vinculacion_clientes ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

vinculacionClientesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaVinculacionCliente>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    // Genera el siguiente consecutivo con formato VC000001.
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.cliente!.trim(),
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
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

vinculacionClientesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaVinculacionCliente>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE vinculacion_clientes SET fecha=$2, cliente=$3, documento=$4,
              telefono=$5, direccion=$6, tipo_persona=$7, tipo_solicitud=$8,
              estado=$9, observaciones=$10, datos=$11::jsonb
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.cliente!.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.direccion?.trim() || null,
        body.tipoPersona?.trim() || null,
        body.tipoSolicitud?.trim() || null,
        body.estado?.trim() || 'Pendiente',
        body.observaciones?.trim() || null,
        JSON.stringify(body.datos ?? {}),
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

vinculacionClientesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const password = ((req.body?.password as string | undefined) ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    if (!passwordEliminarValida(password)) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }
    const rows = await query(
      'DELETE FROM vinculacion_clientes WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
