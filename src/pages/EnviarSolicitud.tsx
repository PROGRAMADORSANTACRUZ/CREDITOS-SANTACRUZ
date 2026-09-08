import { useState } from 'react'
import { api } from '../services/api'

// Perfil Asesor: registra el correo del tercero (cliente o proveedor) para
// enviarle el link del formulario correspondiente, o el link de actualizacion
// de datos de un tercero ya registrado.
export function EnviarSolicitud() {
  const [entidad, setEntidad] = useState<'cliente' | 'proveedor'>('cliente')
  const [tipo, setTipo] = useState<'solicitud' | 'actualizacion'>('solicitud')
  const [email, setEmail] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<
    { tipo: 'ok' | 'error'; texto: string; link?: string } | null
  >(null)

  const esProveedor = entidad === 'proveedor'
  const tercero = esProveedor ? 'proveedor' : 'cliente'

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setMsg(null)
    try {
      const res = await api.crearInvitacion({
        email: email.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        tipo,
        entidad,
      })
      const nombreCompleto = `${res.nombres} ${res.apellidos}`.trim()
      const destino = nombreCompleto
        ? `${nombreCompleto} (${res.email})`
        : res.email
      const accion =
        tipo === 'actualizacion'
          ? 'actualizar sus datos'
          : esProveedor
            ? 'diligenciar su registro'
            : 'diligenciar su solicitud'
      setMsg({
        tipo: 'ok',
        texto:
          res.correoEnviado === false
            ? `Enlace creado para ${destino}, pero el correo no se pudo enviar. ${res.aviso ?? ''} Copia el enlace de abajo y compártelo con el ${tercero}.`
            : `Enlace enviado a ${destino}. El ${tercero} recibirá el correo para ${accion}.`,
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
          Enviar enlace al tercero y proveedor
        </h2>
        <p className="text-sm text-slate-500">
          Envía un enlace único y seguro para que el {tercero} diligencie su
          formulario o actualice sus datos.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Tipo de tercero
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            {(
              [
                ['cliente', 'Cliente'],
                ['proveedor', 'Proveedor'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setEntidad(val)
                  setTipo('solicitud')
                  setMsg(null)
                }}
                className={`px-4 py-2 font-medium transition ${
                  entidad === val
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Tipo de envío
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            {(
              [
                [
                  'solicitud',
                  esProveedor ? 'Registro de proveedor' : 'Solicitud de crédito',
                ],
                ['actualizacion', 'Actualización de datos'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setTipo(val)
                  setMsg(null)
                }}
                className={`px-4 py-2 font-medium transition ${
                  tipo === val
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          {esProveedor ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre o razón social
              </label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Nombre o razón social"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ) : (
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
          )}
          {tipo === 'actualizacion' && (
            <p className="text-xs text-slate-400">
              Al {tercero} le llegará el mismo formulario que diligenció, ya
              precargado, para que actualice sus datos (no genera un nuevo
              registro). Debe usar el mismo correo con el que se registró.
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Correo electrónico del {tercero}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`correo@${tercero}.com`}
              data-no-upper
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enviando
              ? 'Enviando...'
              : tipo === 'actualizacion'
                ? 'Enviar enlace de actualización'
                : `Enviar enlace al ${tercero}`}
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
          <li>
            Eliges el tipo de tercero, el tipo de envío e ingresas el correo.
          </li>
          <li>
            El {tercero} abre el correo y diligencia (o actualiza) su
            formulario.
          </li>
          <li>La información llega al equipo de revisión.</li>
        </ol>
      </div>
    </div>
  )
}
