import { useState, type ReactNode } from 'react'

interface Props {
  titulo?: string
  descripcion?: ReactNode
  eliminando: boolean
  error: string | null
  onCancelar: () => void
  onConfirmar: (password: string) => void
}

export function ModalEliminar({
  titulo = 'Eliminar',
  descripcion,
  eliminando,
  error,
  onCancelar,
  onConfirmar,
}: Props) {
  const [password, setPassword] = useState('')

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    onConfirmar(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={enviar}
        autoComplete="off"
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {descripcion ?? 'Esta accion no se puede deshacer.'} Ingresa tu
            contrasena para confirmar.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contrasena
          </label>
          <input
            type="password"
            name="clave-confirmacion"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={eliminando}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </form>
    </div>
  )
}
