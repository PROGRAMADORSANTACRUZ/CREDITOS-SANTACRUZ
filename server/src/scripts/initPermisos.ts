import { pool, query } from '../db.js'
import { permisosPorRol, type RolUsuario } from '../types.js'

// Agrega la columna permisos a usuarios y asigna los permisos por defecto
// segun el rol a los usuarios que aun no los tengan.
async function main() {
  await query(
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos JSONB NOT NULL DEFAULT '[]'",
  )

  const filas = await query(
    "SELECT id, rol FROM usuarios WHERE permisos IS NULL OR permisos = '[]'::jsonb",
  )
  for (const f of filas) {
    const permisos = permisosPorRol(f.rol as RolUsuario)
    await query('UPDATE usuarios SET permisos = $1::jsonb WHERE id = $2', [
      JSON.stringify(permisos),
      f.id,
    ])
  }

  console.log(`Columna permisos lista. Usuarios actualizados: ${filas.length}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
