import pg from 'pg'
import { config } from './config.js'

// Devuelve columnas NUMERIC como number (por defecto pg las entrega como string).
pg.types.setTypeParser(1700, (valor) =>
  valor === null ? null : Number.parseFloat(valor),
)

// Devuelve columnas DATE como texto 'YYYY-MM-DD' (evita desfases de zona horaria).
pg.types.setTypeParser(1082, (valor) => valor)

export const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err)
})

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}
