import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { VinculacionClientes } from './pages/VinculacionClientes'
import { RegistroProveedores } from './pages/RegistroProveedores'
import { RegistroActualizacionProveedores } from './pages/RegistroActualizacionProveedores'

export const router = createBrowserRouter([
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
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
