import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../store/auth'

/** Recibe el ticket SSO emitido por la Suite, lo canjea y entra a la app. */
export function SsoCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { loginConSso } = useAuth()
  const [error, setError] = useState('')
  const yaCorrio = useRef(false)

  useEffect(() => {
    if (yaCorrio.current) return
    yaCorrio.current = true

    const ticket = params.get('ticket')
    if (!ticket) {
      setError('Falta el ticket SSO en el enlace.')
      return
    }

    loginConSso(ticket)
      // Recarga real a la raíz: el AuthProvider rehidrata la sesión desde el
      // token ya guardado, evitando la carrera con el guard que rebota a /login.
      .then(() => { window.location.replace('/') })
      .catch((e: unknown) =>
        setError(
          (e as { message?: string })?.message ??
            'No se pudo iniciar sesión por SSO.',
        ),
      )
  }, [params, loginConSso, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="mb-1 text-lg font-semibold text-slate-800">No se pudo entrar</h1>
            <p className="mb-5 text-sm text-slate-500">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Ir al inicio de sesión
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            <h1 className="text-lg font-semibold text-slate-800">Iniciando sesión…</h1>
            <p className="mt-1 text-sm text-slate-500">Validando tu acceso desde la Suite.</p>
          </>
        )}
      </div>
    </div>
  )
}
