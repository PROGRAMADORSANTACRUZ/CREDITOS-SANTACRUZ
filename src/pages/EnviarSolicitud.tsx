import { useEffect, useState } from 'react'
import { api } from '../services/api'

type ClienteActualizable = {
  id: string
  cliente: string
  documento: string
  consecutivo: string
  email: string
}

// Perfil Asesor: registra el correo del cliente para enviarle el link de la
// solicitud de credito, o el link de actualizacion de datos de un cliente ya
// registrado.
export function EnviarSolicitud() {
  const [tipo, setTipo] = useState<'solicitud' | 'actualizacion'>('solicitud')
  const [email, setEmail] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [clientes, setClientes] = useState<ClienteActualizable[]>([])
  const [clienteId, setClienteId] = useState('')
  const [cargandoClientes, setCargandoClientes] = useState(false)
  const [msg, setMsg] = useState<
    { tipo: 'ok' | 'error'; texto: string; link?: string } | null
  >(null)

  // Carga la lista de clientes registrados al cambiar a modo actualizacion.
  useEffect(() => {
    if (tipo !== 'actualizacion' || clientes.length > 0) return
    setCargandoClientes(true)
    api
      .clientesParaActualizar()
      .then((lista) => setClientes(lista))
      .catch(() => setClientes([]))
      .finally(() => setCargandoClientes(false))
  }, [tipo, clientes.length])

  function seleccionarCliente(id: string) {
    setClienteId(id)
    const c = clientes.find((x) => x.id === id)
    if (c) setEmail(c.email ?? '')
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (tipo === 'actualizacion' && !clienteId) {
      setMsg({ tipo: 'error', texto: 'Selecciona el cliente a actualizar.' })
      return
    }
    setEnviando(true)
    setMsg(null)
    try {
      const res = await api.crearInvitacion(
        tipo === 'actualizacion'
          ? { email: email.trim(), tipo, solicitudId: clienteId }
          : {
              email: email.trim(),
              nombres: nombres.trim(),
              apellidos: apellidos.trim(),
              tipo,
            },
      )
      const nombreCompleto = `${res.nombres} ${res.apellidos}`.trim()
      const destino = nombreCompleto
        ? `${nombreCompleto} (${res.email})`
        : res.email
      const accion =
        tipo === 'actualizacion'
          ? 'actualizar sus datos'
          : 'diligenciar su solicitud'
      setMsg({
        tipo: 'ok',
        texto:
          res.correoEnviado === false
            ? `Enlace creado para ${destino}, pero el correo no se pudo enviar. ${res.aviso ?? ''} Copia el enlace de abajo y compártelo con el cliente.`
            : `Enlace enviado a ${destino}. El cliente recibirá el correo para ${accion}.`,
        link: res.link,
      })
      setEmail('')
      setNombres('')
      setApellidos('')
      setClienteId('')
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
          Enviar enlace al cliente
        </h2>
        <p className="text-sm text-slate-500">
          Envía un enlace único y seguro para que el cliente diligencie su
          Solicitud de crédito o actualice sus datos.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Tipo de envío
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            {(
              [
                ['solicitud', 'Solicitud de crédito'],
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
          {tipo === 'actualizacion' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Cliente a actualizar
              </label>
              <select
                required
                value={clienteId}
                onChange={(e) => seleccionarCliente(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">
                  {cargandoClientes
                    ? 'Cargando clientes...'
                    : 'Seleccione un cliente...'}
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.consecutivo, c.cliente, c.documento]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                El cliente recibirá su formulario ya diligenciado para
                actualizar sus datos (no genera una nueva solicitud de crédito).
              </p>
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
            {enviando
              ? 'Enviando...'
              : tipo === 'actualizacion'
                ? 'Enviar enlace de actualización'
                : 'Enviar enlace al cliente'}
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
          <li>Eliges el tipo de envío e ingresas el correo del cliente.</li>
          <li>
            El cliente abre el correo y diligencia (o actualiza) su formulario.
          </li>
          <li>La información llega al equipo de revisión.</li>
        </ol>
      </div>
    </div>
  )
}
