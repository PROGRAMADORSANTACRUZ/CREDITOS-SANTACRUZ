import { enviarLinkSolicitud } from '../mailer.js'
import { config } from '../config.js'

// Envia un correo de prueba para validar la configuracion SMTP.
// Uso: tsx src/scripts/probarCorreo.ts destino@correo.com
async function main() {
  const destino = process.argv[2] || config.smtp.user
  console.log(`Enviando correo de prueba a ${destino} ...`)
  await enviarLinkSolicitud(destino, `${config.appUrl}/solicitud/PRUEBA123`)
  console.log('Correo enviado correctamente.')
}

main().catch((err) => {
  console.error('Fallo el envio:', err instanceof Error ? err.message : err)
  process.exit(1)
})
