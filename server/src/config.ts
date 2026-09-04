import 'dotenv/config'

function requerido(nombre: string, valorPorDefecto?: string): string {
  const valor = process.env[nombre] ?? valorPorDefecto
  if (valor === undefined) {
    throw new Error(`Falta la variable de entorno ${nombre}`)
  }
  return valor
}

export const config = {
  port: Number(process.env.PORT ?? 4001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5174',
  jwtSecret: process.env.JWT_SECRET ?? 'cambia-esta-clave-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  seedPassword: process.env.SEED_PASSWORD ?? 'creditos123',
  // Contrasena unica requerida para confirmar eliminaciones (sin login).
  deletePassword: process.env.DELETE_PASSWORD ?? 'eliminar',
  // URL publica del frontend, usada para armar el link de la solicitud.
  appUrl: process.env.APP_URL ?? 'http://localhost:5174',
  // SSO con la Suite Santa Cruz (canje de tickets server-to-server).
  sso: {
    suiteUrl: (process.env.SUITE_URL ?? process.env.SCTOOLS_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
    sharedSecret: process.env.SSO_SHARED_SECRET ?? '',
  },
  // Horas de validez del link de invitacion al cliente.
  invitacionHoras: Number(process.env.INVITACION_HORAS ?? 24),
  // Configuracion SMTP para el envio de correos (Nodemailer).
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
  },
  db: {
    host: requerido('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 5432),
    database: requerido('DB_DATABASE', 'creditos'),
    user: requerido('DB_USER', 'postgres'),
    password: requerido('DB_PASSWORD', ''),
  },
}
