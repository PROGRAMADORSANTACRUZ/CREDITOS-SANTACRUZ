import { Router } from 'express'
import { query } from '../db.js'
import {
  firmarToken,
  requireAuth,
  verificarPassword,
  type TokenPayload,
} from '../auth.js'
import type { RolUsuario, Usuario } from '../types.js'
import { sanearPermisos } from '../types.js'

export const authRouter = Router()

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

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = ((req.body?.email as string | undefined) ?? '').trim().toLowerCase()
    const password = (req.body?.password as string | undefined) ?? ''
    if (!email || !password) {
      res.status(400).json({ error: 'Debes ingresar correo y contrasena' })
      return
    }
    const filas = await query(
      `SELECT id, nombre, email, rol, activo, permisos, password_hash, fecha_creacion
         FROM usuarios WHERE lower(email) = $1`,
      [email],
    )
    const usuario = filas[0]
    const hash = usuario?.password_hash as string | null
    if (!usuario || !hash || !(await verificarPassword(password, hash))) {
      res.status(401).json({ error: 'Correo o contrasena incorrectos' })
      return
    }
    if (!usuario.activo) {
      res.status(403).json({ error: 'Usuario inactivo' })
      return
    }
    const payload: TokenPayload = {
      sub: String(usuario.id),
      email: usuario.email as string,
      rol: usuario.rol as RolUsuario,
      nombre: usuario.nombre as string,
      permisos: sanearPermisos(usuario.permisos),
    }
    res.json({ token: firmarToken(payload), usuario: mapUsuario(usuario) })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const filas = await query(
      `SELECT id, nombre, email, rol, activo, permisos, fecha_creacion
         FROM usuarios WHERE id = $1`,
      [req.usuario!.sub],
    )
    if (filas.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }
    res.json(mapUsuario(filas[0]))
  } catch (err) {
    next(err)
  }
})
