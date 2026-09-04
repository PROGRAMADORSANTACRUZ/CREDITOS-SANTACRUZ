import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RutaProtegida } from './components/RutaProtegida'
import { VinculacionClientes } from './pages/VinculacionClientes'
import { RegistroProveedores } from './pages/RegistroProveedores'
import { RegistroActualizacionProveedores } from './pages/RegistroActualizacionProveedores'
import { PanelSolicitudes } from './pages/PanelSolicitudes'
import { EnviarSolicitud } from './pages/EnviarSolicitud'
import { Usuarios } from './pages/Usuarios'
import { InicioRedirect } from './pages/InicioRedirect'
import { Login } from './pages/Login'
import { SolicitudPublica } from './pages/SolicitudPublica'
import { SsoCallback } from './pages/SsoCallback'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/sso/callback', element: <SsoCallback /> },
  { path: '/solicitud/:token', element: <SolicitudPublica /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <InicioRedirect /> },
      {
        path: 'enviar-solicitud',
        element: (
          <RutaProtegida modulo="enviar-solicitud">
            <EnviarSolicitud />
          </RutaProtegida>
        ),
      },
      {
        path: 'panel-solicitudes',
        element: (
          <RutaProtegida modulo="panel-solicitudes">
            <PanelSolicitudes />
          </RutaProtegida>
        ),
      },
      {
        path: 'vinculacion-clientes',
        element: (
          <RutaProtegida modulo="vinculacion-clientes">
            <VinculacionClientes />
          </RutaProtegida>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <RutaProtegida modulo="usuarios">
            <Usuarios />
          </RutaProtegida>
        ),
      },
      {
        path: 'registro-proveedores',
        element: (
          <RutaProtegida modulo="registro-proveedores">
            <RegistroProveedores />
          </RutaProtegida>
        ),
      },
      {
        path: 'registro-actualizacion-proveedores',
        element: (
          <RutaProtegida modulo="registro-actualizacion-proveedores">
            <RegistroActualizacionProveedores />
          </RutaProtegida>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
