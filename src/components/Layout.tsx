import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

const navItems = [
  { to: '/vinculacion-clientes', label: 'Solicitud de credito' },
  { to: '/registro-proveedores', label: 'Registro de proveedores' },
  {
    to: '/registro-actualizacion-proveedores',
    label: 'Registro / actualizacion proveedores',
  },
]

export function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-72 flex-col bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-6 py-5">
          <h1 className="font-display text-xl font-bold tracking-tight">
            CREDITOS
          </h1>
          <p className="text-xs text-slate-400">Creditos y proveedores</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
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

          <div className="my-3 border-t border-slate-800" />

          {usuario ? (
            <NavLink
              to="/panel-solicitudes"
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              Panel de analisis
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Ingreso analista
            </NavLink>
          )}
        </nav>

        {usuario && (
          <div className="border-t border-slate-800 px-4 py-4">
            <p className="text-sm font-medium text-white">{usuario.nombre}</p>
            <p className="text-xs text-slate-400">{usuario.rol}</p>
            <button
              onClick={onLogout}
              className="mt-2 w-full rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Cerrar sesion
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
