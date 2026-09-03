import cors from 'cors'
import express from 'express'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { query } from './db.js'
import { permisosPorRol, type RolUsuario } from './types.js'
import { authRouter } from './routes/auth.js'
import { usuariosRouter } from './routes/usuarios.js'
import { invitacionesRouter } from './routes/invitaciones.js'
import { vinculacionClientesRouter } from './routes/vinculacionClientes.js'
import { registroProveedoresRouter } from './routes/registroProveedores.js'
import { registroActualizacionProveedoresRouter } from './routes/registroActualizacionProveedores.js'

const app = express()

app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({ status: 'ok', db: 'conectado' })
  } catch {
    res.status(500).json({ status: 'error', db: 'sin conexion' })
  }
})

// Liveness: responde aunque la base de datos no este disponible.
app.get('/api/live', (_req, res) => {
  res.json({ status: 'ok' })
})

// Modulos de creditos (acceso publico, sin login).
app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/invitaciones', invitacionesRouter)
app.use('/api/vinculacion-clientes', vinculacionClientesRouter)
app.use('/api/registro-proveedores', registroProveedoresRouter)
app.use(
  '/api/registro-actualizacion-proveedores',
  registroActualizacionProveedoresRouter,
)

// Manejador de errores.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor' })
  },
)

// Garantiza en el arranque los cambios de esquema recientes, para que cualquier
// despliegue funcione sin ejecutar migraciones manuales (idempotente).
async function asegurarEsquema(): Promise<void> {
  await query(
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos JSONB NOT NULL DEFAULT '[]'",
  )
  const sinPermisos = await query(
    "SELECT id, rol FROM usuarios WHERE permisos IS NULL OR permisos = '[]'::jsonb",
  )
  for (const u of sinPermisos) {
    await query('UPDATE usuarios SET permisos = $1::jsonb WHERE id = $2', [
      JSON.stringify(permisosPorRol(u.rol as RolUsuario)),
      u.id,
    ])
  }
  await query(
    "CREATE TABLE IF NOT EXISTS invitaciones_solicitud (" +
      " id SERIAL PRIMARY KEY," +
      " token VARCHAR(80) NOT NULL UNIQUE," +
      " email VARCHAR(150) NOT NULL," +
      " nombres VARCHAR(150)," +
      " apellidos VARCHAR(150)," +
      " estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente'," +
      " asesor VARCHAR(150)," +
      " solicitud_id INTEGER REFERENCES vinculacion_clientes(id)," +
      " fecha_expira TIMESTAMP NOT NULL," +
      " fecha_uso TIMESTAMP," +
      " fecha_creacion TIMESTAMP NOT NULL DEFAULT now()" +
      ")",
  )
  await query(
    'ALTER TABLE invitaciones_solicitud ADD COLUMN IF NOT EXISTS nombres VARCHAR(150)',
  )
  await query(
    'ALTER TABLE invitaciones_solicitud ADD COLUMN IF NOT EXISTS apellidos VARCHAR(150)',
  )
  await query(
    "ALTER TABLE invitaciones_solicitud ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'solicitud'",
  )

  // Crea un administrador por defecto si no existe ninguno, para que siempre
  // haya un acceso valido tras un despliegue nuevo.
  const admins = await query(
    "SELECT 1 FROM usuarios WHERE rol = 'Administrador' AND activo = true LIMIT 1",
  )
  if (admins.length === 0) {
    const email = process.env.ADMIN_EMAIL ?? 'admin@creditos.com'
    const nombre = process.env.ADMIN_NOMBRE ?? 'ADMIN'
    const password = process.env.ADMIN_PASSWORD ?? '123456'
    const passwordHash = await bcrypt.hash(password, 10)
    await query(
      `INSERT INTO usuarios (nombre, email, rol, activo, permisos, password_hash)
         VALUES ($1, $2, 'Administrador', true, $3::jsonb, $4)
       ON CONFLICT (email) DO UPDATE
         SET rol = 'Administrador', activo = true,
             permisos = EXCLUDED.permisos,
             password_hash = EXCLUDED.password_hash`,
      [nombre, email, JSON.stringify(permisosPorRol('Administrador')), passwordHash],
    )
    console.log(`Administrador por defecto asegurado: ${email}`)
  }
}

app.listen(config.port, () => {
  console.log(`CREDITOS API escuchando en http://localhost:${config.port}`)
  asegurarEsquema().catch((err) => {
    console.error('No se pudo asegurar el esquema al arrancar:', err)
  })
})
