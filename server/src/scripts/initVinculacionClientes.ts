import { pool, query } from '../db.js'

// Crea la tabla de vinculacion de clientes si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS vinculacion_clientes (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' cliente        VARCHAR(200) NOT NULL,' +
      ' documento      VARCHAR(50),' +
      ' telefono       VARCHAR(50),' +
      ' direccion      VARCHAR(250),' +
      ' tipo_persona   VARCHAR(50),' +
      ' tipo_solicitud VARCHAR(50),' +
      " estado         VARCHAR(30) DEFAULT 'Pendiente'," +
      ' observaciones  TEXT,' +
      ' consecutivo    VARCHAR(20),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  // Detalle completo del formulario F-FIN-01 (multi-seccion).
  await query(
    "ALTER TABLE vinculacion_clientes ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}'",
  )
  console.log('Tabla vinculacion_clientes lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
