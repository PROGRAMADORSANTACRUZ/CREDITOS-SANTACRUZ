import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import { VinculacionClientes } from './VinculacionClientes'

type Estado = 'cargando' | 'valido' | 'invalido' | 'enviado'

export function SolicitudPublica() {
  const { token = '' } = useParams()
  const [estado, setEstado] = useState<Estado>('cargando')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [consecutivo, setConsecutivo] = useState('')
  const [tipo, setTipo] = useState<'solicitud' | 'actualizacion'>('solicitud')
  const [datosPrevios, setDatosPrevios] = useState<Record<
    string,
    unknown
  > | null>(null)

  useEffect(() => {
    let activo = true
    api
      .validarInvitacion(token)
      .then((res) => {
        if (!activo) return
        setEmail(res.email)
        setTipo(res.tipo === 'actualizacion' ? 'actualizacion' : 'solicitud')
        setDatosPrevios(res.datosPrevios ?? null)
        setEstado('valido')
      })
      .catch((err: unknown) => {
        if (!activo) return
        setMensaje(
          err instanceof Error ? err.message : 'El enlace no es válido',
        )
        setEstado('invalido')
      })
    return () => {
      activo = false
    }
  }, [token])

  if (estado === 'cargando') {
    return (
      <Centro>
        <p className="text-slate-500">Validando enlace...</p>
      </Centro>
    )
  }

  if (estado === 'invalido') {
    return (
      <Centro>
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-red-600">
            Enlace no disponible
          </h1>
          <p className="text-slate-600">{mensaje}</p>
          <p className="mt-4 text-sm text-slate-500">
            Comunícate con tu asesor de Carnes Santacruz para solicitar un nuevo
            enlace.
          </p>
        </div>
      </Centro>
    )
  }

  if (estado === 'enviado') {
    return (
      <Centro>
        <div className="max-w-lg rounded-2xl border border-emerald-100 bg-white p-10 text-center shadow-lg">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-9 w-9 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-slate-900">
            {tipo === 'actualizacion'
              ? '¡Datos actualizados con éxito!'
              : '¡Solicitud enviada con éxito!'}
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            {tipo === 'actualizacion' ? (
              <>
                Hemos recibido la actualización de tu información. Gracias por
                mantener tus datos al día.
              </>
            ) : (
              <>
                Su solicitud será revisada en un plazo máximo de{' '}
                <strong>24 horas</strong>. Por favor, esté pendiente de su{' '}
                <strong>correo electrónico</strong> o de una{' '}
                <strong>llamada telefónica</strong>.
              </>
            )}
          </p>
          {consecutivo && (
            <p className="mt-5 inline-block rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-500">
              Radicado: {consecutivo}
            </p>
          )}
          <p className="mt-6 text-sm text-slate-400">
            Carnes Santacruz S.A.S. — Gracias por su confianza.
          </p>
        </div>
      </Centro>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <VinculacionClientes
          modoPublico={{
            token,
            emailCliente: email,
            tipo,
            datosPrevios,
            onEnviado: (cons) => {
              setConsecutivo(cons)
              setEstado('enviado')
            },
          }}
        />
      </div>
    </div>
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      {children}
    </div>
  )
}
