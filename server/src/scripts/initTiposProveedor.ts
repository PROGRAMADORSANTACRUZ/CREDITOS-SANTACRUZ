import { pool, query } from '../db.js'

// Crea la tabla del catalogo de tipos de proveedor y siembra los valores
// iniciales que antes estaban fijos en el formulario.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS tipos_proveedor (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' nombre         VARCHAR(120) NOT NULL,' +
      ' activo         BOOLEAN NOT NULL DEFAULT true,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  const total = await query('SELECT COUNT(*)::int AS n FROM tipos_proveedor')
  if ((total[0]?.n ?? 0) === 0) {
    await query(
      "INSERT INTO tipos_proveedor (nombre) VALUES ('Insumos/Servicios'), ('Animales en pie')",
    )
  }
  console.log('Tabla tipos_proveedor lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
