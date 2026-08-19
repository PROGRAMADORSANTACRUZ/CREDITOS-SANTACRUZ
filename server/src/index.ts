import cors from 'cors'
import express from 'express'
import { config } from './config.js'
import { query } from './db.js'
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

app.listen(config.port, () => {
  console.log(`CREDITOS API escuchando en http://localhost:${config.port}`)
})
