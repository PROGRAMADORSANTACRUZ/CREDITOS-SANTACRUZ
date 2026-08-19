import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../store/auth'
import type { Modulo } from '../types/trazabilidad'

export function RutaProtegida({
  children,
  modulo,
}: {
  children: ReactNode
  modulo?: Modulo
}) {
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

  if (modulo && !usuario.permisos.includes(modulo)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-slate-800">
          No tienes acceso a esta sección
        </p>
        <p className="text-sm text-slate-500">
          Tu perfil no cuenta con los permisos necesarios para este módulo.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
