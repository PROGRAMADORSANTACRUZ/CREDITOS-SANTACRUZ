import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { useAuth } from '../store/auth'

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as Location & { state?: { from?: string } }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            CREDITOS
          </h1>
          <p className="text-sm text-slate-500">Panel de analisis de credito</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Correo
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-no-upper
          autoComplete="username"
          className={`${inputClase} mb-4`}
          required
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Contrasena
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-no-upper
          autoComplete="current-password"
          className={`${inputClase} mb-6`}
          required
        />

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {enviando ? 'Ingresando...' : 'Iniciar sesion'}
        </button>
      </form>
    </div>
  )
}
