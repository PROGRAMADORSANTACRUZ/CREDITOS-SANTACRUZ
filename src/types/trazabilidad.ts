// ---------------------------- Usuarios / auth ----------------------------
export type RolUsuario = 'Administrador' | 'Operador' | 'Consulta'

export const ROLES: RolUsuario[] = ['Administrador', 'Operador', 'Consulta']

// Modulos (secciones) a los que un usuario puede tener acceso.
export const MODULOS = [
  'enviar-solicitud',
  'panel-solicitudes',
  'vinculacion-clientes',
  'registro-proveedores',
  'registro-actualizacion-proveedores',
  'usuarios',
  'tipos-proveedor',
] as const
export type Modulo = (typeof MODULOS)[number]

export const MODULOS_LABEL: Record<Modulo, string> = {
  'enviar-solicitud': 'Enviar solicitud a terceros',
  'panel-solicitudes': 'Revisión de solicitudes',
  'vinculacion-clientes': 'Solicitud de crédito (manual)',
  'registro-proveedores': 'Registro de proveedores',
  'registro-actualizacion-proveedores': 'Registro / actualización proveedores',
  usuarios: 'Usuarios',
  'tipos-proveedor': 'Tipo de proveedor',
}

export function permisosPorRol(rol: RolUsuario): Modulo[] {
  switch (rol) {
    case 'Administrador':
      return [...MODULOS]
    case 'Operador':
      return [
        'enviar-solicitud',
        'registro-proveedores',
        'registro-actualizacion-proveedores',
      ]
    case 'Consulta':
      return ['panel-solicitudes']
  }
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  permisos: Modulo[]
  fechaCreacion: string
}

export type NuevoUsuario = Omit<Usuario, 'id' | 'fechaCreacion'> & {
  password?: string
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

// ------------------------ Vinculacion de clientes ------------------------
export interface VinculacionCliente {
  id: string
  fecha?: string
  cliente: string
  documento?: string
  telefono?: string
  direccion?: string
  tipoPersona?: string
  tipoSolicitud?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  entidad?: 'cliente' | 'proveedor'
  datos?: Record<string, unknown>
  fechaCreacion: string
}

// ------------- Registro unico de proveedores y contratistas -------------
export interface RegistroProveedor {
  id: string
  fecha?: string
  proveedor: string
  nit?: string
  telefono?: string
  correo?: string
  tipoProveedor?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}

// ------------------------- Tipos de proveedor -------------------------
export interface TipoProveedor {
  id: string
  nombre: string
  activo: boolean
  fechaCreacion: string
}

// ------------- Registro y/o actualizacion de proveedores -------------
export interface RegistroActualizacionProveedor {
  id: string
  fecha?: string
  proveedor: string
  documento?: string
  telefono?: string
  correo?: string
  clasificacion?: string
  tipoRegistro?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}
