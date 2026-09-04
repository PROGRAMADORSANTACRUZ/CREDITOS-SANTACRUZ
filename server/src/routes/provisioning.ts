import { Router, type NextFunction, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { config } from '../config.js'
import { ROLES, MODULOS, permisosPorRol, sanearPermisos, type RolUsuario } from '../types.js'

// API server-to-server que la Suite usa para reflejar usuarios/permisos aquí.
// La Suite es la fuente de verdad; se autentica con el secreto compartido SSO.
export const provisioningRouter = Router()

function requireSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = config.sso.sharedSecret
  const provided = req.headers['x-sso-secret']
  if (!secret || provided !== secret) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  next()
}

provisioningRouter.use(requireSecret)

function normalizeRol(rol: unknown): RolUsuario {
  const r = (rol ?? '').toString()
  return (ROLES as string[]).includes(r) ? (r as RolUsuario) : 'Consulta'
}

const norm = (v: unknown) => (v ?? '').toString().trim()
const normEmail = (v: unknown) => norm(v).toLowerCase() || null

provisioningRouter.get('/catalogo', (_req, res) => {
  res.json({
    roles: ROLES,
    grupos: [{ label: 'Módulos', modules: MODULOS.map((m) => ({ key: m, label: m })) }],
  })
})

provisioningRouter.get('/usuarios', async (_req, res, next) => {
  try {
    const rows = await query('SELECT cedula, nombre, email, rol, activo FROM usuarios ORDER BY nombre')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

provisioningRouter.get('/usuarios/:cedula', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT cedula, nombre, email, rol, activo, permisos FROM usuarios WHERE cedula = $1',
      [req.params.cedula],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'No existe' })
      return
    }
    const u = rows[0]
    res.json({
      cedula: u.cedula,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      activo: u.activo,
      permisos: sanearPermisos(u.permisos),
    })
  } catch (err) {
    next(err)
  }
})

provisioningRouter.post('/usuarios', async (req, res, next) => {
  try {
    const body = req.body ?? {}
    const cedula = norm(body.cedula) || null
    const email = normEmail(body.email)
    const nombre = norm(body.nombre) || null
    if (!cedula && !email) {
      res.status(400).json({ error: 'Se requiere cédula o email' })
      return
    }

    let existing = cedula
      ? (await query('SELECT id FROM usuarios WHERE cedula = $1', [cedula]))[0]
      : undefined
    if (!existing && email) {
      existing = (await query('SELECT id FROM usuarios WHERE lower(email) = $1', [email]))[0]
    }

    const rol = normalizeRol(body.rol)
    const activo = body.activo === undefined ? true : Boolean(body.activo)
    const permisos = JSON.stringify(
      Array.isArray(body.permisos) ? sanearPermisos(body.permisos) : permisosPorRol(rol),
    )
    const hash = body.password ? await bcrypt.hash(String(body.password), 10) : null

    if (existing) {
      await query(
        `UPDATE usuarios SET
           cedula = COALESCE($1, cedula),
           nombre = COALESCE($2, nombre),
           email = COALESCE($3, email),
           rol = $4,
           activo = $5,
           permisos = $6::jsonb,
           password_hash = COALESCE($7, password_hash)
         WHERE id = $8`,
        [cedula, nombre, email, rol, activo, permisos, hash, existing.id],
      )
      res.json({ ok: true, action: 'updated', id: existing.id })
      return
    }

    const inserted = await query(
      `INSERT INTO usuarios (nombre, email, cedula, rol, activo, password_hash, permisos)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id`,
      [nombre ?? email ?? cedula, email, cedula, rol, activo, hash, permisos],
    )
    res.json({ ok: true, action: 'created', id: inserted[0].id })
  } catch (err) {
    next(err)
  }
})

provisioningRouter.patch('/usuarios/:cedula/estado', async (req, res, next) => {
  try {
    const { activo, bloqueadoSuite } = req.body ?? {}
    let act: boolean | null = null
    if (bloqueadoSuite === true) act = false
    else if (activo !== undefined) act = Boolean(activo)

    const r = await query(
      'UPDATE usuarios SET activo = COALESCE($1, activo) WHERE cedula = $2 RETURNING id',
      [act, req.params.cedula],
    )
    if (r.length === 0) {
      res.status(404).json({ error: 'No existe' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

provisioningRouter.patch('/usuarios/:cedula/password', async (req, res, next) => {
  try {
    const hash = await bcrypt.hash(String(req.body?.password ?? ''), 10)
    const r = await query('UPDATE usuarios SET password_hash = $1 WHERE cedula = $2 RETURNING id', [
      hash,
      req.params.cedula,
    ])
    if (r.length === 0) {
      res.status(404).json({ error: 'No existe' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

provisioningRouter.patch('/usuarios/:cedula/permisos', async (req, res, next) => {
  try {
    const { rol, permisos } = req.body ?? {}
    const rolFinal = rol ? normalizeRol(rol) : null
    const perms = Array.isArray(permisos) ? JSON.stringify(sanearPermisos(permisos)) : null
    const r = await query(
      'UPDATE usuarios SET rol = COALESCE($1, rol), permisos = COALESCE($2::jsonb, permisos) WHERE cedula = $3 RETURNING id',
      [rolFinal, perms, req.params.cedula],
    )
    if (r.length === 0) {
      res.status(404).json({ error: 'No existe' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
