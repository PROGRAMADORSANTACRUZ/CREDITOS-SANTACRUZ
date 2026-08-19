import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import type { Modulo } from '../types/trazabilidad'

// Ruta de inicio de cada modulo, en orden de prioridad.
const RUTA_MODULO: Record<Modulo, string> = {
  'panel-solicitudes': '/panel-solicitudes',
  'enviar-solicitud': '/enviar-solicitud',
  usuarios: '/usuarios',
  'vinculacion-clientes': '/vinculacion-clientes',
  'registro-proveedores': '/registro-proveedores',
  'registro-actualizacion-proveedores': '/registro-actualizacion-proveedores',
}

const ORDEN: Modulo[] = [
  'panel-solicitudes',
  'enviar-solicitud',
  'usuarios',
  'vinculacion-clientes',
  'registro-proveedores',
  'registro-actualizacion-proveedores',
]

// Redirige al usuario a su primera seccion disponible segun sus permisos.
export function InicioRedirect() {
  const { usuario, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Cargando...
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />

  const primero = ORDEN.find((m) => usuario.permisos.includes(m))
  if (primero) return <Navigate to={RUTA_MODULO[primero]} replace />

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg font-semibold text-slate-800">Sin módulos asignados</p>
      <p className="text-sm text-slate-500">
        Tu usuario no tiene acceso a ningún módulo. Contacta al administrador.
      </p>
    </div>
  )
}
