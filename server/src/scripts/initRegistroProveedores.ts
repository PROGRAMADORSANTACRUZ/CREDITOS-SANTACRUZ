import { pool, query } from '../db.js'

// Crea la tabla del registro unico de proveedores y contratistas si no existe.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS registro_proveedores (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' proveedor      VARCHAR(200) NOT NULL,' +
      ' nit            VARCHAR(50),' +
      ' telefono       VARCHAR(50),' +
      ' correo         VARCHAR(150),' +
      ' tipo_proveedor VARCHAR(80),' +
      " estado         VARCHAR(30) DEFAULT 'Pendiente'," +
      ' observaciones  TEXT,' +
      ' consecutivo    VARCHAR(20),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  // Detalle completo del formulario F-DC-001 (multi-seccion).
  await query(
    "ALTER TABLE registro_proveedores ADD COLUMN IF NOT EXISTS datos JSONB DEFAULT '{}'",
  )
  console.log('Tabla registro_proveedores lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
