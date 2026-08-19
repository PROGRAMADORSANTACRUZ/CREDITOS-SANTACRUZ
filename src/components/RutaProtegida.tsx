import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../store/auth'

export function RutaProtegida({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Cargando...
      </div>
    )
  }

  if (!usuario) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  return <>{children}</>
}
