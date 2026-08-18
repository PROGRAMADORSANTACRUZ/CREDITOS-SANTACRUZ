/**
 * Crea (o actualiza) un usuario administrador.
 * Uso: npm run crear:admin
 *
 * Valores por defecto (se pueden sobrescribir por variables de entorno):
 *   ADMIN_EMAIL    (default admin@creditos.com)
 *   ADMIN_NOMBRE   (default ADMIN)
 *   ADMIN_PASSWORD (default 123456)
 */
import bcrypt from 'bcryptjs'
import { pool, query } from '../db.js'

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@creditos.com'
  const nombre = process.env.ADMIN_NOMBRE ?? 'ADMIN'
  const password = process.env.ADMIN_PASSWORD ?? '123456'

  const passwordHash = await bcrypt.hash(password, 10)

  await query(
    `INSERT INTO usuarios (nombre, email, rol, activo, password_hash)
     VALUES ($1, $2, 'Administrador', true, $3)
     ON CONFLICT (email) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           rol = 'Administrador',
           activo = true,
           password_hash = EXCLUDED.password_hash`,
    [nombre, email, passwordHash],
  )

  await pool.end()
  console.log(`Usuario administrador listo: ${email} (password: ${password})`)
}

main().catch((err) => {
  console.error('Error creando el usuario administrador:', err)
  process.exit(1)
})
