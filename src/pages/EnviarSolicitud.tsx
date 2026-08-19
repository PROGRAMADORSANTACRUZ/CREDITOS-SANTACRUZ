import { useState } from 'react'
import { api } from '../services/api'

// Perfil Asesor: registra el correo del cliente para enviarle el link de la solicitud.
export function EnviarSolicitud() {
  const [email, setEmail] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<
    { tipo: 'ok' | 'error'; texto: string; link?: string } | null
  >(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setMsg(null)
    try {
      const res = await api.crearInvitacion({
        email: email.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
      })
      const nombreCompleto = `${res.nombres} ${res.apellidos}`.trim()
      const destino = nombreCompleto
        ? `${nombreCompleto} (${res.email})`
        : res.email
      setMsg({
        tipo: 'ok',
        texto:
          res.correoEnviado === false
            ? `Solicitud creada para ${destino}, pero el correo no se pudo enviar. ${res.aviso ?? ''} Copia el enlace de abajo y compártelo con el cliente.`
            : `Enlace enviado a ${destino}. El cliente recibirá el correo para diligenciar su solicitud.`,
        link: res.link,
      })
      setEmail('')
      setNombres('')
      setApellidos('')
    } catch (err) {
      const anyErr = err as { link?: string }
      setMsg({
        tipo: 'error',
        texto:
          err instanceof Error ? err.message : 'No se pudo enviar la invitación',
        link: anyErr.link,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Enviar solicitud de crédito
        </h2>
        <p className="text-sm text-slate-500">
          Registra el correo del cliente. Le llegará un enlace único y seguro
          para que diligencie su Solicitud de crédito.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombres
              </label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Nombres"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Apellidos
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Apellidos"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Correo electrónico del cliente
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@cliente.com"
              data-no-upper
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando ? 'Enviando...' : 'Enviar enlace al cliente'}
          </button>
        </form>

        {msg && (
          <div
            className={`mt-4 rounded-md px-3 py-3 text-sm ${
              msg.tipo === 'ok'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            <p>{msg.texto}</p>
            {msg.link && (
              <p className="mt-2 break-all text-xs">
                Enlace:{' '}
                <a
                  href={msg.link}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {msg.link}
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
        <p className="font-medium text-slate-700">¿Cómo funciona?</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Ingresas el correo del cliente y envías el enlace.</li>
          <li>El cliente abre el correo y diligencia su solicitud.</li>
          <li>La solicitud llega al equipo de revisión para su análisis.</li>
        </ol>
      </div>
    </div>
  )
}
