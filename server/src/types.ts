// ---------------------------- Usuarios / auth ----------------------------
export type RolUsuario = 'Administrador' | 'Operador' | 'Consulta'

export const ROLES: RolUsuario[] = ['Administrador', 'Operador', 'Consulta']

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
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
  datos?: Record<string, unknown>
  fechaCreacion: string
}
export type NuevaVinculacionCliente = Omit<
  VinculacionCliente,
  'id' | 'fechaCreacion' | 'consecutivo'
>

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
export type NuevoRegistroProveedor = Omit<
  RegistroProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>

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
export type NuevoRegistroActualizacionProveedor = Omit<
  RegistroActualizacionProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>
