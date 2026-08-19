import { pool, query } from '../db.js'

// Crea la tabla del registro y/o actualizacion de proveedores si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS registro_actualizacion_proveedores (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' proveedor      VARCHAR(200) NOT NULL,' +
      ' documento      VARCHAR(50),' +
      ' telefono       VARCHAR(50),' +
      ' correo         VARCHAR(150),' +
      ' clasificacion  VARCHAR(80),' +
      ' tipo_registro  VARCHAR(40),' +
      " estado         VARCHAR(30) DEFAULT 'Pendiente'," +
      ' observaciones  TEXT,' +
      ' consecutivo    VARCHAR(20),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  // Detalle completo del formulario FOR-DC-001 (multi-seccion).
  await query(
    "ALTER TABLE registro_actualizacion_proveedores ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}'",
  )
  console.log('Tabla registro_actualizacion_proveedores lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
