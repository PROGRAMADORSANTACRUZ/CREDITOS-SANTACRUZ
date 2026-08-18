/**
 * Inicializa la base de datos ejecutando schema.sql en PostgreSQL.
 * Uso: npm run db:init
 *
 * Se conecta primero a la base "postgres" para crear la base destino
 * si aun no existe, y luego ejecuta el schema.
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { config } from '../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function crearBaseSiNoExiste() {
  const admin = new pg.Client({
    host: config.db.host,
    port: config.db.port,
    database: 'postgres',
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 10000,
  })
  await admin.connect()
  const existe = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [config.db.database],
  )
  if (existe.rowCount === 0) {
    // El nombre de la base no puede ir parametrizado; se valida el formato.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.db.database)) {
      throw new Error(`Nombre de base de datos invalido: ${config.db.database}`)
    }
    await admin.query(`CREATE DATABASE "${config.db.database}"`)
    console.log(`Base de datos "${config.db.database}" creada.`)
  }
  await admin.end()
}

async function main() {
  const skipDbCreate = process.env.SKIP_DB_CREATE === 'true'
  if (!skipDbCreate) {
    await crearBaseSiNoExiste()
  } else {
    console.log('SKIP_DB_CREATE=true: omitiendo creacion/verificacion de base.')
  }

  const rutaSchema = join(__dirname, '..', 'schema.sql')
  const script = await readFile(rutaSchema, 'utf8')

  const client = new pg.Client({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 10000,
  })
  await client.connect()

  console.log('Ejecutando schema.sql...')
  await client.query(script)

  // Asigna una password por defecto a los usuarios semilla sin hash.
  const hash = await bcrypt.hash(config.seedPassword, 10)
  const actualizados = await client.query(
    'UPDATE usuarios SET password_hash = $1 WHERE password_hash IS NULL',
    [hash],
  )
  if ((actualizados.rowCount ?? 0) > 0) {
    console.log(
      `Password por defecto asignada a ${actualizados.rowCount} usuario(s): "${config.seedPassword}"`,
    )
  }

  await client.end()
  console.log('Base de datos CREDITOS inicializada correctamente.')
}

main().catch((err) => {
  console.error('Error inicializando la base de datos:', err)
  process.exit(1)
})
