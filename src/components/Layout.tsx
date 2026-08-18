import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/vinculacion-clientes', label: 'Solicitud de credito' },
  { to: '/registro-proveedores', label: 'Registro de proveedores' },
  {
    to: '/registro-actualizacion-proveedores',
    label: 'Registro / actualizacion proveedores',
  },
]

export function Layout() {
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
        </nav>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
