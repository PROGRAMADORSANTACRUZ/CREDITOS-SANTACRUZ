/**
 * Crea (o actualiza) un usuario con un rol dado.
 * Uso: npm run crear:usuario -- <email> <password> <rol> [nombre]
 *   rol: Administrador | Operador (Asesor) | Consulta (Revisor)
 *
 * Ejemplos:
 *   npm run crear:usuario -- asesor@creditos.com 123456 Operador "ASESOR UNO"
 *   npm run crear:usuario -- revisor@creditos.com 123456 Consulta "REVISOR UNO"
 */
import bcrypt from 'bcryptjs'
import { pool, query } from '../db.js'
import { ROLES, permisosPorRol, type RolUsuario } from '../types.js'

async function main() {
  const [email, password, rol, ...nombrePartes] = process.argv.slice(2)

  if (!email || !password || !rol) {
    console.error(
      'Faltan argumentos. Uso: npm run crear:usuario -- <email> <password> <rol> [nombre]',
    )
    process.exit(1)
  }
  if (!ROLES.includes(rol as RolUsuario)) {
    console.error(`Rol invalido. Debe ser uno de: ${ROLES.join(', ')}`)
    process.exit(1)
  }

  const nombre = nombrePartes.join(' ') || email.split('@')[0].toUpperCase()
  const passwordHash = await bcrypt.hash(password, 10)
  const permisos = JSON.stringify(permisosPorRol(rol as RolUsuario))

  await query(
    `INSERT INTO usuarios (nombre, email, rol, activo, permisos, password_hash)
     VALUES ($1, $2, $3, true, $4::jsonb, $5)
     ON CONFLICT (email) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           rol = EXCLUDED.rol,
           activo = true,
           permisos = EXCLUDED.permisos,
           password_hash = EXCLUDED.password_hash`,
    [nombre, email, rol, permisos, passwordHash],
  )

  await pool.end()
  console.log(`Usuario listo: ${email} (rol: ${rol}, password: ${password})`)
}

main().catch((err) => {
  console.error('Error creando el usuario:', err)
  process.exit(1)
})
