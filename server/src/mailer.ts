import nodemailer from 'nodemailer'
import { config } from './config.js'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!config.smtp.host || !config.smtp.user) {
    throw new Error(
      'SMTP no configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASSWORD en el archivo .env',
    )
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.password },
    })
  }
  return transporter
}

export async function enviarLinkSolicitud(
  destino: string,
  link: string,
  tipo: 'solicitud' | 'actualizacion' = 'solicitud',
  entidad: 'cliente' | 'proveedor' = 'cliente',
): Promise<void> {
  const esActualizacion = tipo === 'actualizacion'
  const esProveedor = entidad === 'proveedor'
  const documento = esProveedor
    ? 'Registro único de proveedores y contratistas'
    : 'Solicitud de crédito'
  const intro = esActualizacion
    ? 'Te invitamos a <strong>actualizar tus datos</strong>. Para actualizar tu información, ingresa aquí:'
    : `Has sido invitado a diligenciar tu <strong>${documento}</strong>. Haz clic en el siguiente botón para completar el formulario:`
  const textoBoton = esActualizacion
    ? 'Actualizar mis datos'
    : esProveedor
      ? 'Diligenciar registro'
      : 'Diligenciar solicitud'
  const asunto = esActualizacion
    ? 'Actualización de datos - Grupo Santacruz'
    : esProveedor
      ? 'Registro de proveedor - Grupo Santacruz'
      : 'Solicitud de crédito - Grupo Santacruz'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
      <h2 style="color:#be123c">Grupo Santacruz</h2>
      <p>Hola,</p>
      <p>${intro}</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#be123c;color:#fff;padding:12px 24px;
           border-radius:8px;text-decoration:none;font-weight:bold">
          ${textoBoton}
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
        <a href="${link}">${link}</a>
      </p>
      <p style="font-size:13px;color:#64748b">
        Este enlace es de un solo uso y vence en ${config.invitacionHoras} horas.
      </p>
    </div>`

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: destino,
    subject: asunto,
    html,
  })
}

// Avisa al revisor de cartera que se guardo un nuevo registro (solicitud o
// proveedor) para que ingrese a revisarlo.
export async function enviarAvisoNuevoRegistro(datos: {
  consecutivo: string
  nombre: string
  entidad: 'cliente' | 'proveedor'
  actualizacion?: boolean
}): Promise<void> {
  const esProveedor = datos.entidad === 'proveedor'
  const que = esProveedor ? 'proveedor' : 'cliente'
  const accion = datos.actualizacion ? 'actualizó su registro' : 'diligenció una nueva solicitud'
  const asunto = `Nuevo registro de ${que} (${datos.consecutivo}) - Grupo Santacruz`
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
      <h2 style="color:#be123c">Grupo Santacruz</h2>
      <p>Se recibió un nuevo registro para revisión.</p>
      <ul style="font-size:14px;line-height:1.7">
        <li><strong>Tipo:</strong> ${esProveedor ? 'Proveedor' : 'Cliente'}</li>
        <li><strong>Nombre:</strong> ${datos.nombre}</li>
        <li><strong>Radicado:</strong> ${datos.consecutivo}</li>
        <li><strong>Acción:</strong> ${accion}</li>
      </ul>
      <p style="font-size:13px;color:#64748b">
        Ingresa al panel de revisión para gestionar la solicitud.
      </p>
    </div>`

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: config.correoRevisor,
    subject: asunto,
    html,
  })
}
