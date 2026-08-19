import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../store/auth'
import {
  MODULOS,
  MODULOS_LABEL,
  ROLES,
  permisosPorRol,
  type Modulo,
  type NuevoUsuario,
  type RolUsuario,
  type Usuario,
} from '../types/trazabilidad'

const nombreRol: Record<RolUsuario, string> = {
  Administrador: 'Administrador',
  Operador: 'Asesor',
  Consulta: 'Revisor',
}

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

interface FormUsuario {
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  password: string
  permisos: Modulo[]
}

function formVacio(): FormUsuario {
  return {
    nombre: '',
    email: '',
    rol: 'Consulta',
    activo: true,
    password: '',
    permisos: permisosPorRol('Consulta'),
  }
}

export function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [datos, setDatos] = useState<FormUsuario>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<Usuario | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setUsuarios(await api.getUsuarios())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  function abrirNuevo() {
    setDatos(formVacio())
    setEditandoId(null)
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(u: Usuario) {
    setDatos({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      activo: u.activo,
      password: '',
      permisos: u.permisos,
    })
    setEditandoId(u.id)
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setErrorForm(null)
  }

  // Al cambiar el rol, precarga los permisos por defecto de ese perfil.
  function cambiarRol(rol: RolUsuario) {
    setDatos((d) => ({ ...d, rol, permisos: permisosPorRol(rol) }))
  }

  function alternarPermiso(m: Modulo) {
    setDatos((d) => ({
      ...d,
      permisos: d.permisos.includes(m)
        ? d.permisos.filter((p) => p !== m)
        : [...d.permisos, m],
    }))
  }

  const formValido = useMemo(() => {
    if (!datos.nombre.trim()) return false
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return false
    if (!editandoId && datos.password.length < 6) return false
    if (editandoId && datos.password && datos.password.length < 6) return false
    return true
  }, [datos, editandoId])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido) return
    setGuardando(true)
    setErrorForm(null)
    const payload: NuevoUsuario = {
      nombre: datos.nombre.trim(),
      email: datos.email.trim().toLowerCase(),
      rol: datos.rol,
      activo: datos.activo,
      permisos: datos.permisos,
    }
    if (datos.password) payload.password = datos.password
    try {
      if (editandoId) {
        const actualizado = await api.actualizarUsuario(editandoId, payload)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === editandoId ? actualizado : u)),
        )
      } else {
        const creado = await api.crearUsuario(payload)
        setUsuarios((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await api.eliminarUsuario(aEliminar.id)
      setUsuarios((prev) => prev.filter((u) => u.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
      setAEliminar(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Usuarios
          </h2>
          <p className="text-sm text-slate-500">
            Administra los accesos: asesores, revisores y administradores.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Módulos</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {u.nombre}
                  {yo?.id === u.id && (
                    <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">
                      tú
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {nombreRol[u.rol]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-500">
                    {u.permisos.length} módulo
                    {u.permisos.length === 1 ? '' : 's'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      u.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => abrirEdicion(u)}
                    className="mr-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setAEliminar(u)}
                    disabled={yo?.id === u.id}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={guardar}
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                className={inputClase}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <input
                type="email"
                value={datos.email}
                onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                data-no-upper
                className={inputClase}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Perfil
              </label>
              <select
                value={datos.rol}
                onChange={(e) => cambiarRol(e.target.value as RolUsuario)}
                className={inputClase}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {nombreRol[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Módulos a los que puede acceder
              </label>
              <p className="mb-2 text-xs text-slate-400">
                Al cambiar el perfil se marcan los módulos sugeridos. Puedes
                ajustarlos manualmente.
              </p>
              <div className="space-y-1.5 rounded-md border border-slate-200 p-3">
                {MODULOS.map((m) => (
                  <label
                    key={m}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={datos.permisos.includes(m)}
                      onChange={() => alternarPermiso(m)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    {MODULOS_LABEL[m]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contraseña{' '}
                {editandoId && (
                  <span className="text-xs font-normal text-slate-400">
                    (déjala vacía para no cambiarla)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={datos.password}
                onChange={(e) => setDatos({ ...datos, password: e.target.value })}
                data-no-upper
                placeholder={editandoId ? '••••••' : 'Mínimo 6 caracteres'}
                className={inputClase}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={datos.activo}
                onChange={(e) => setDatos({ ...datos, activo: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Usuario activo
            </label>

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cerrarForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formValido || guardando}
                className="rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {aEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Eliminar usuario
            </h3>
            <p className="text-sm text-slate-600">
              ¿Seguro que deseas eliminar a <strong>{aEliminar.nombre}</strong> (
              {aEliminar.email})? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAEliminar(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
