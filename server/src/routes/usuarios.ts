import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, requireRol, hashPassword } from '../auth.js'
import {
  ROLES,
  permisosPorRol,
  sanearPermisos,
  type RolUsuario,
  type Usuario,
} from '../types.js'

export const usuariosRouter = Router()

function mapUsuario(r: Record<string, unknown>): Usuario {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    email: r.email as string,
    rol: r.rol as RolUsuario,
    activo: r.activo as boolean,
    permisos: sanearPermisos(r.permisos),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function esEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

// Todas las rutas requieren rol Administrador.
usuariosRouter.use(requireAuth, requireRol('Administrador'))

usuariosRouter.get('/', async (_req, res, next) => {
  try {
    const filas = await query(
      `SELECT id, nombre, email, rol, activo, permisos, fecha_creacion
         FROM usuarios ORDER BY fecha_creacion DESC`,
    )
    res.json(filas.map(mapUsuario))
  } catch (err) {
    next(err)
  }
})

usuariosRouter.post('/', async (req, res, next) => {
  try {
    const nombre = ((req.body?.nombre as string | undefined) ?? '').trim()
    const email = ((req.body?.email as string | undefined) ?? '').trim().toLowerCase()
    const rol = (req.body?.rol as string | undefined) ?? ''
    const password = (req.body?.password as string | undefined) ?? ''
    const activo = req.body?.activo !== false

    const errores: string[] = []
    if (!nombre) errores.push('El nombre es obligatorio')
    if (!esEmail(email)) errores.push('El correo no es valido')
    if (!ROLES.includes(rol as RolUsuario)) errores.push('El rol no es valido')
    if (password.length < 6)
      errores.push('La contrasena debe tener al menos 6 caracteres')
    if (errores.length) {
      res.status(400).json({ errores })
      return
    }

    const existe = await query('SELECT 1 FROM usuarios WHERE email = $1', [email])
    if (existe.length) {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
      return
    }

    // Si no se envian permisos explicitos, se usan los del rol.
    const permisos =
      req.body?.permisos === undefined
        ? permisosPorRol(rol as RolUsuario)
        : sanearPermisos(req.body.permisos)

    const passwordHash = await hashPassword(password)
    const filas = await query(
      `INSERT INTO usuarios (nombre, email, rol, activo, permisos, password_hash)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, nombre, email, rol, activo, permisos, fecha_creacion`,
      [nombre, email, rol, activo, JSON.stringify(permisos), passwordHash],
    )
    res.status(201).json(mapUsuario(filas[0]))
  } catch (err) {
    next(err)
  }
})

usuariosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const nombre = ((req.body?.nombre as string | undefined) ?? '').trim()
    const email = ((req.body?.email as string | undefined) ?? '').trim().toLowerCase()
    const rol = (req.body?.rol as string | undefined) ?? ''
    const activo = req.body?.activo !== false
    const password = (req.body?.password as string | undefined) ?? ''

    const errores: string[] = []
    if (!nombre) errores.push('El nombre es obligatorio')
    if (!esEmail(email)) errores.push('El correo no es valido')
    if (!ROLES.includes(rol as RolUsuario)) errores.push('El rol no es valido')
    if (password && password.length < 6)
      errores.push('La contrasena debe tener al menos 6 caracteres')
    if (errores.length) {
      res.status(400).json({ errores })
      return
    }

    // Evita que el administrador se quite a si mismo el acceso.
    if (String(req.usuario!.sub) === String(id) && (rol !== 'Administrador' || !activo)) {
      res.status(400).json({ error: 'No puedes cambiar tu propio rol o desactivarte' })
      return
    }

    const duplicado = await query(
      'SELECT 1 FROM usuarios WHERE email = $1 AND id <> $2',
      [email, id],
    )
    if (duplicado.length) {
      res.status(409).json({ error: 'Ya existe otro usuario con ese correo' })
      return
    }

    const passwordHash = password ? await hashPassword(password) : null
    const permisos =
      req.body?.permisos === undefined
        ? permisosPorRol(rol as RolUsuario)
        : sanearPermisos(req.body.permisos)
    const filas = await query(
      `UPDATE usuarios
          SET nombre = $1,
              email = $2,
              rol = $3,
              activo = $4,
              permisos = $5::jsonb,
              password_hash = COALESCE($6, password_hash)
        WHERE id = $7
        RETURNING id, nombre, email, rol, activo, permisos, fecha_creacion`,
      [nombre, email, rol, activo, JSON.stringify(permisos), passwordHash, id],
    )
    if (!filas.length) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }
    res.json(mapUsuario(filas[0]))
  } catch (err) {
    next(err)
  }
})

usuariosRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    if (String(req.usuario!.sub) === String(id)) {
      res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })
      return
    }
    const filas = await query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [
      id,
    ])
    if (!filas.length) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
