import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { TipoProveedor } from '../types/trazabilidad'

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

interface FormTipo {
  nombre: string
  activo: boolean
}

function formVacio(): FormTipo {
  return { nombre: '', activo: true }
}

export function TiposProveedor() {
  const [tipos, setTipos] = useState<TipoProveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [datos, setDatos] = useState<FormTipo>(formVacio())
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<TipoProveedor | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setTipos(await api.getTiposProveedor())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los tipos')
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

  function abrirEdicion(t: TipoProveedor) {
    setDatos({ nombre: t.nombre, activo: t.activo })
    setEditandoId(t.id)
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setErrorForm(null)
  }

  const formValido = useMemo(() => datos.nombre.trim().length > 0, [datos])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido) return
    setGuardando(true)
    setErrorForm(null)
    const payload = { nombre: datos.nombre.trim(), activo: datos.activo }
    try {
      if (editandoId) {
        const actualizado = await api.actualizarTipoProveedor(
          editandoId,
          payload,
        )
        setTipos((prev) =>
          prev.map((t) => (t.id === editandoId ? actualizado : t)),
        )
      } else {
        const creado = await api.crearTipoProveedor(payload)
        setTipos((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function confirmarEliminar(password: string) {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarTipoProveedor(aEliminar.id, password)
      setTipos((prev) => prev.filter((t) => t.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Tipo de proveedor
          </h2>
          <p className="text-sm text-slate-500">
            Catálogo de tipos usados en el formulario de registro de proveedores.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo tipo
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
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            )}
            {!cargando && tipos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No hay tipos registrados.
                </td>
              </tr>
            )}
            {tipos.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {t.nombre}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      t.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => abrirEdicion(t)}
                    className="mr-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setErrorEliminar(null)
                      setAEliminar(t)
                    }}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
              {editandoId ? 'Editar tipo de proveedor' : 'Nuevo tipo de proveedor'}
            </h3>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                autoFocus
                value={datos.nombre}
                onChange={(e) =>
                  setDatos((d) => ({ ...d, nombre: e.target.value }))
                }
                className={inputClase}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={datos.activo}
                onChange={(e) =>
                  setDatos((d) => ({ ...d, activo: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Activo
            </label>

            {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}

            <div className="flex justify-end gap-3">
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
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar tipo de proveedor"
          descripcion={`Se eliminará "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={confirmarEliminar}
        />
      )}
    </div>
  )
}
