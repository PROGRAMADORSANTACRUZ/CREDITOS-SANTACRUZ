import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import type { VinculacionCliente } from '../types/trazabilidad'
import { AnalisisCupo } from './AnalisisCupo'

const ESTADOS = ['', 'Pendiente', 'Aprobado', 'Aplazado', 'Negado']

function colorEstado(estado?: string): string {
  switch (estado) {
    case 'Aprobado':
      return 'bg-green-100 text-green-700'
    case 'Aplazado':
      return 'bg-amber-100 text-amber-700'
    case 'Negado':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function PanelSolicitudes() {
  const [registros, setRegistros] = useState<VinculacionCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [seleccion, setSeleccion] = useState<VinculacionCliente | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getVinculacionClientes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (filtroEstado && (r.estado ?? 'Pendiente') !== filtroEstado) return false
      if (!t) return true
      return (
        r.cliente.toLowerCase().includes(t) ||
        (r.documento ?? '').toLowerCase().includes(t) ||
        (r.consecutivo ?? '').toLowerCase().includes(t)
      )
    })
  }, [registros, busqueda, filtroEstado])

  const kpis = useMemo(() => {
    let pendientes = 0
    let aprobados = 0
    let negados = 0
    for (const r of registros) {
      const e = r.estado ?? 'Pendiente'
      if (e === 'Aprobado') aprobados += 1
      else if (e === 'Negado') negados += 1
      else pendientes += 1
    }
    return { total: registros.length, pendientes, aprobados, negados }
  }, [registros])

  function onGuardado(actualizado: VinculacionCliente) {
    setRegistros((rs) => rs.map((r) => (r.id === actualizado.id ? actualizado : r)))
    setSeleccion(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Solicitudes de credito
        </h2>
        <p className="text-sm text-slate-500">
          Analiza cada solicitud y registra la decision del comite.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Total" valor={kpis.total} />
        <Kpi titulo="Pendientes" valor={kpis.pendientes} />
        <Kpi titulo="Aprobados" valor={kpis.aprobados} />
        <Kpi titulo="Negados" valor={kpis.negados} />
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, documento o consecutivo"
          data-no-upper
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {s || 'Todos los estados'}
            </option>
          ))}
        </select>
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
              <th className="px-4 py-3">Consecutivo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Accion</th>
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
            {!cargando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay solicitudes.
                </td>
              </tr>
            )}
            {filtrados.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">
                  {r.consecutivo ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-800">{r.cliente}</td>
                <td className="px-4 py-3 text-slate-600">{r.documento ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.fecha ?? '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorEstado(
                      r.estado,
                    )}`}
                  >
                    {r.estado ?? 'Pendiente'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setSeleccion(r)}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Analizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seleccion && (
        <AnalisisCupo
          solicitud={seleccion}
          onClose={() => setSeleccion(null)}
          onGuardado={onGuardado}
        />
      )}
    </div>
  )
}

function Kpi({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
    </div>
  )
}
