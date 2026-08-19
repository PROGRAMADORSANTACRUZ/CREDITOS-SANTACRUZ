import { pool, query } from '../db.js'

// Crea la tabla de invitaciones para enviar el link de la solicitud al cliente.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS invitaciones_solicitud (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' token          VARCHAR(80) NOT NULL UNIQUE,' +
      ' email          VARCHAR(150) NOT NULL,' +
      ' nombres        VARCHAR(150),' +
      ' apellidos      VARCHAR(150),' +
      " estado         VARCHAR(20) NOT NULL DEFAULT 'Pendiente'," +
      ' asesor         VARCHAR(150),' +
      ' solicitud_id   INTEGER REFERENCES vinculacion_clientes(id),' +
      ' fecha_expira   TIMESTAMP NOT NULL,' +
      ' fecha_uso      TIMESTAMP,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  await query(
    'ALTER TABLE invitaciones_solicitud ADD COLUMN IF NOT EXISTS nombres VARCHAR(150)',
  )
  await query(
    'ALTER TABLE invitaciones_solicitud ADD COLUMN IF NOT EXISTS apellidos VARCHAR(150)',
  )
  console.log('Tabla invitaciones_solicitud lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
