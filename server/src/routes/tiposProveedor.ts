import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, requirePermiso, passwordEliminarValida } from '../auth.js'

export const tiposProveedorRouter = Router()

function map(r: Record<string, unknown>): {
  id: string
  nombre: string
  activo: boolean
  fechaCreacion: string
} {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    activo: (r.activo as boolean) ?? true,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

const COLS = 'id, nombre, activo, fecha_creacion'

// Lista publica: el formulario publico del proveedor necesita las opciones
// activas sin autenticacion. Devuelve solo los tipos activos.
tiposProveedorRouter.get('/publicos', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM tipos_proveedor WHERE activo = true ORDER BY nombre ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

tiposProveedorRouter.get(
  '/',
  requireAuth,
  requirePermiso('tipos-proveedor'),
  async (_req, res, next) => {
    try {
      const rows = await query(
        `SELECT ${COLS} FROM tipos_proveedor ORDER BY nombre ASC`,
      )
      res.json(rows.map(map))
    } catch (err) {
      next(err)
    }
  },
)

tiposProveedorRouter.post(
  '/',
  requireAuth,
  requirePermiso('tipos-proveedor'),
  async (req, res, next) => {
    try {
      const nombre = ((req.body?.nombre as string | undefined) ?? '').trim()
      if (!nombre) {
        res.status(400).json({ error: 'El nombre es obligatorio' })
        return
      }
      const dup = await query(
        'SELECT 1 FROM tipos_proveedor WHERE lower(nombre) = lower($1) LIMIT 1',
        [nombre],
      )
      if (dup.length > 0) {
        res.status(409).json({ error: 'Ya existe un tipo con ese nombre' })
        return
      }
      const ins = await query(
        `INSERT INTO tipos_proveedor (nombre, activo)
         VALUES ($1, $2) RETURNING ${COLS}`,
        [nombre, req.body?.activo === false ? false : true],
      )
      res.status(201).json(map(ins[0]))
    } catch (err) {
      next(err)
    }
  },
)

tiposProveedorRouter.put(
  '/:id',
  requireAuth,
  requirePermiso('tipos-proveedor'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'id invalido' })
        return
      }
      const nombre = ((req.body?.nombre as string | undefined) ?? '').trim()
      if (!nombre) {
        res.status(400).json({ error: 'El nombre es obligatorio' })
        return
      }
      const dup = await query(
        'SELECT 1 FROM tipos_proveedor WHERE lower(nombre) = lower($1) AND id <> $2 LIMIT 1',
        [nombre, id],
      )
      if (dup.length > 0) {
        res.status(409).json({ error: 'Ya existe un tipo con ese nombre' })
        return
      }
      const upd = await query(
        `UPDATE tipos_proveedor SET nombre = $2, activo = $3
          WHERE id = $1 RETURNING ${COLS}`,
        [id, nombre, req.body?.activo === false ? false : true],
      )
      if (upd.length === 0) {
        res.status(404).json({ error: 'Tipo no encontrado' })
        return
      }
      res.json(map(upd[0]))
    } catch (err) {
      next(err)
    }
  },
)

tiposProveedorRouter.delete(
  '/:id',
  requireAuth,
  requirePermiso('tipos-proveedor'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        res.status(400).json({ error: 'id invalido' })
        return
      }
      const password = (req.body?.password as string | undefined) ?? ''
      if (!passwordEliminarValida(password)) {
        res.status(403).json({ error: 'Contraseña de eliminación incorrecta' })
        return
      }
      await query('DELETE FROM tipos_proveedor WHERE id = $1', [id])
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
)
