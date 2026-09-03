import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'
import type { Modulo, RolUsuario } from '../types/trazabilidad'

interface NavItem {
  to: string
  label: string
  modulo: Modulo
}

const navItems: NavItem[] = [
  {
    to: '/enviar-solicitud',
    label: 'Enviar solicitud a cliente',
    modulo: 'enviar-solicitud',
  },
  {
    to: '/panel-solicitudes',
    label: 'Revisión de solicitudes',
    modulo: 'panel-solicitudes',
  },
  {
    to: '/vinculacion-clientes',
    label: 'Solicitud de crédito (manual)',
    modulo: 'vinculacion-clientes',
  },
  {
    to: '/registro-proveedores',
    label: 'Registro de proveedores',
    modulo: 'registro-proveedores',
  },
  {
    to: '/registro-actualizacion-proveedores',
    label: 'Registro / actualización proveedores',
    modulo: 'registro-actualizacion-proveedores',
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    modulo: 'usuarios',
  },
]

const nombreRol: Record<RolUsuario, string> = {
  Administrador: 'Administrador',
  Operador: 'Asesor',
  Consulta: 'Revisor',
}

export function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const items = usuario
    ? navItems.filter((item) => usuario.permisos.includes(item.modulo))
    : []

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-72 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-6 py-5">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Clientes
          </h1>
          <p className="text-xs text-slate-400">Grupo Santacruz S.A.S.</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {!usuario && (
            <NavLink
              to="/login"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Ingresar
            </NavLink>
          )}
        </nav>

        {usuario && (
          <div className="border-t border-slate-800 px-4 py-4">
            <p className="text-sm font-medium text-white">{usuario.nombre}</p>
            <p className="text-xs text-slate-400">{nombreRol[usuario.rol]}</p>
            <button
              onClick={onLogout}
              className="mt-2 w-full rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
