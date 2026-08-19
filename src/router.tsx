import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RutaProtegida } from './components/RutaProtegida'
import { VinculacionClientes } from './pages/VinculacionClientes'
import { RegistroProveedores } from './pages/RegistroProveedores'
import { RegistroActualizacionProveedores } from './pages/RegistroActualizacionProveedores'
import { PanelSolicitudes } from './pages/PanelSolicitudes'
import { Login } from './pages/Login'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/vinculacion-clientes" replace />,
      },
      { path: 'vinculacion-clientes', element: <VinculacionClientes /> },
      { path: 'registro-proveedores', element: <RegistroProveedores /> },
      {
        path: 'registro-actualizacion-proveedores',
        element: <RegistroActualizacionProveedores />,
      },
      {
        path: 'panel-solicitudes',
        element: (
          <RutaProtegida>
            <PanelSolicitudes />
          </RutaProtegida>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
