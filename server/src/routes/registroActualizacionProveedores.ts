import { Router } from 'express'
import { query } from '../db.js'
import { passwordEliminarValida } from '../auth.js'
import type {
  NuevoRegistroActualizacionProveedor,
  RegistroActualizacionProveedor,
} from '../types.js'

export const registroActualizacionProveedoresRouter = Router()

function map(r: Record<string, unknown>): RegistroActualizacionProveedor {
  return {
    id: String(r.id),
    fecha:
      r.fecha != null
        ? r.fecha instanceof Date
          ? r.fecha.toISOString().slice(0, 10)
          : String(r.fecha).slice(0, 10)
        : undefined,
    proveedor: r.proveedor as string,
    documento: (r.documento as string | null) ?? undefined,
    telefono: (r.telefono as string | null) ?? undefined,
    correo: (r.correo as string | null) ?? undefined,
    clasificacion: (r.clasificacion as string | null) ?? undefined,
    tipoRegistro: (r.tipo_registro as string | null) ?? undefined,
    estado: (r.estado as string | null) ?? undefined,
    observaciones: (r.observaciones as string | null) ?? undefined,
    consecutivo: (r.consecutivo as string | null) ?? undefined,
    datos: (r.datos as Record<string, unknown> | null) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoRegistroActualizacionProveedor>): string[] {
  const errores: string[] = []
  if (!body.proveedor || !body.proveedor.trim())
    errores.push('proveedor es obligatorio')
  return errores
}

const COLS = `id, fecha, proveedor, documento, telefono, correo, clasificacion,
              tipo_registro, estado, observaciones, consecutivo, datos,
              fecha_creacion`

registroActualizacionProveedoresRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM registro_actualizacion_proveedores
        ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

registroActualizacionProveedoresRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoRegistroActualizacionProveedor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    // Genera el siguiente consecutivo con formato RA000001.
    const seq = await query(
      `SELECT COALESCE(
                MAX(CAST(SUBSTRING(consecutivo FROM 3) AS INTEGER)), 0
              ) + 1 AS next
         FROM registro_actualizacion_proveedores
        WHERE consecutivo ~ '^RA[0-9]+$'`,
    )
    const next = Number((seq[0] as { next: number }).next) || 1
    const consecutivo = 'RA' + String(next).padStart(6, '0')
    const ins = await query(
      `INSERT INTO registro_actualizacion_proveedores
         (fecha, proveedor, documento, telefono, correo, clasificacion,
          tipo_registro, estado, observaciones, consecutivo, datos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.proveedor!.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.correo?.trim() || null,
        body.clasificacion?.trim() || null,
        body.tipoRegistro?.trim() || null,
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

registroActualizacionProveedoresRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoRegistroActualizacionProveedor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE registro_actualizacion_proveedores SET fecha=$2, proveedor=$3,
              documento=$4, telefono=$5, correo=$6, clasificacion=$7,
              tipo_registro=$8, estado=$9, observaciones=$10, datos=$11::jsonb
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.proveedor!.trim(),
        body.documento?.trim() || null,
        body.telefono?.trim() || null,
        body.correo?.trim() || null,
        body.clasificacion?.trim() || null,
        body.tipoRegistro?.trim() || null,
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

registroActualizacionProveedoresRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM registro_actualizacion_proveedores WHERE id=$1 RETURNING id',
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
