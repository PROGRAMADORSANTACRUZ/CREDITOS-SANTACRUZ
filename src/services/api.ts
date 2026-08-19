import type {
  LoginResponse,
  RegistroActualizacionProveedor,
  RegistroProveedor,
  Usuario,
  VinculacionCliente,
} from '../types/trazabilidad'

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:4001/api'

const TOKEN_KEY = 'creditos_token'

let tokenActual: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

export function setToken(token: string | null): void {
  tokenActual = token
  if (typeof localStorage === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getToken(): string | null {
  return tokenActual
}

interface OpcionesPeticion {
  method?: string
  body?: unknown
}

async function pedir<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { method = 'GET', body } = opciones
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (tokenActual) headers['Authorization'] = `Bearer ${tokenActual}`

  const res = await fetch(`${API_URL}${ruta}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    setToken(null)
  }

  if (res.status === 204) return undefined as T

  const texto = await res.text()
  const data = texto ? JSON.parse(texto) : null

  if (!res.ok) {
    const mensaje =
      (data && (data.error || (data.errores && data.errores.join(', ')))) ||
      `Error ${res.status}`
    throw new Error(mensaje)
  }

  return data as T
}

export type NuevaVinculacionCliente = Omit<
  VinculacionCliente,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevoRegistroProveedor = Omit<
  RegistroProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevoRegistroActualizacionProveedor = Omit<
  RegistroActualizacionProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>

export const api = {
  // ------------------------------ Auth ------------------------------
  login(email: string, password: string): Promise<LoginResponse> {
    return pedir<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
  },
  miUsuario(): Promise<Usuario> {
    return pedir<Usuario>('/auth/me')
  },

  // ---------------------- Vinculacion de clientes ----------------------
  getVinculacionClientes(): Promise<VinculacionCliente[]> {
    return pedir<VinculacionCliente[]>('/vinculacion-clientes')
  },
  crearVinculacionCliente(
    payload: NuevaVinculacionCliente,
  ): Promise<VinculacionCliente> {
    return pedir<VinculacionCliente>('/vinculacion-clientes', {
      method: 'POST',
      body: payload,
    })
  },
  actualizarVinculacionCliente(
    id: string,
    payload: NuevaVinculacionCliente,
  ): Promise<VinculacionCliente> {
    return pedir<VinculacionCliente>(`/vinculacion-clientes/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
  eliminarVinculacionCliente(id: string, password: string): Promise<void> {
    return pedir<void>(`/vinculacion-clientes/${id}`, {
      method: 'DELETE',
      body: { password },
    })
  },
  guardarAnalisisCupo(
    id: string,
    payload: {
      analisis: Record<string, unknown>
      estado: string
      observaciones?: string
    },
  ): Promise<VinculacionCliente> {
    return pedir<VinculacionCliente>(`/vinculacion-clientes/${id}/analisis`, {
      method: 'PUT',
      body: payload,
    })
  },

  // --------------- Registro unico de proveedores/contratistas ---------------
  getRegistroProveedores(): Promise<RegistroProveedor[]> {
    return pedir<RegistroProveedor[]>('/registro-proveedores')
  },
  crearRegistroProveedor(
    payload: NuevoRegistroProveedor,
  ): Promise<RegistroProveedor> {
    return pedir<RegistroProveedor>('/registro-proveedores', {
      method: 'POST',
      body: payload,
    })
  },
  actualizarRegistroProveedor(
    id: string,
    payload: NuevoRegistroProveedor,
  ): Promise<RegistroProveedor> {
    return pedir<RegistroProveedor>(`/registro-proveedores/${id}`, {
      method: 'PUT',
      body: payload,
    })
  },
  eliminarRegistroProveedor(id: string, password: string): Promise<void> {
    return pedir<void>(`/registro-proveedores/${id}`, {
      method: 'DELETE',
      body: { password },
    })
  },

  // -------------- Registro y/o actualizacion de proveedores --------------
  getRegistroActualizacionProveedores(): Promise<
    RegistroActualizacionProveedor[]
  > {
    return pedir<RegistroActualizacionProveedor[]>(
      '/registro-actualizacion-proveedores',
    )
  },
  crearRegistroActualizacionProveedor(
    payload: NuevoRegistroActualizacionProveedor,
  ): Promise<RegistroActualizacionProveedor> {
    return pedir<RegistroActualizacionProveedor>(
      '/registro-actualizacion-proveedores',
      { method: 'POST', body: payload },
    )
  },
  actualizarRegistroActualizacionProveedor(
    id: string,
    payload: NuevoRegistroActualizacionProveedor,
  ): Promise<RegistroActualizacionProveedor> {
    return pedir<RegistroActualizacionProveedor>(
      `/registro-actualizacion-proveedores/${id}`,
      { method: 'PUT', body: payload },
    )
  },
  eliminarRegistroActualizacionProveedor(
    id: string,
    password: string,
  ): Promise<void> {
    return pedir<void>(`/registro-actualizacion-proveedores/${id}`, {
      method: 'DELETE',
      body: { password },
    })
  },
}
