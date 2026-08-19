import { useMemo, useState } from 'react'
import { api } from '../services/api'
import type { VinculacionCliente } from '../types/trazabilidad'
import {
  ENTRADA_FINANCIERA_VACIA,
  OPCIONES_ANTIGUEDAD,
  OPCIONES_CALIFICACION,
  OPCIONES_DATACREDITO,
  OPCIONES_VISITA,
  calcularCupo,
  conceptoPorPuntaje,
  type EntradaFinanciera,
  type TipoCliente,
} from '../utils/analisisCupo'

const inputClase =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

const ESTADOS = ['Pendiente', 'Aprobado', 'Aplazado', 'Negado'] as const

interface AnalisisGuardado {
  entrada?: EntradaFinanciera
  cupoAprobado?: number
  fechaDecision?: string
}

function fmt(n: number, dec = 2): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}
function fmtMoneda(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  return '$' + Math.round(n).toLocaleString('es-CO')
}
function pct(n: number): string {
  return fmt(n * 100, 1) + '%'
}

export function AnalisisCupo({
  solicitud,
  onClose,
  onGuardado,
}: {
  solicitud: VinculacionCliente
  onClose: () => void
  onGuardado: (actualizado: VinculacionCliente) => void
}) {
  const guardado = (solicitud.datos?.analisisCupo ?? {}) as AnalisisGuardado
  const [entrada, setEntrada] = useState<EntradaFinanciera>({
    ...ENTRADA_FINANCIERA_VACIA,
    ...(guardado.entrada ?? {}),
  })
  const [estado, setEstado] = useState<string>(solicitud.estado || 'Pendiente')
  const [observaciones, setObservaciones] = useState<string>(
    solicitud.observaciones ?? '',
  )
  const [cupoAprobado, setCupoAprobado] = useState<string>(
    guardado.cupoAprobado != null ? String(guardado.cupoAprobado) : '',
  )
  const [fechaDecision, setFechaDecision] = useState<string>(
    guardado.fechaDecision ?? new Date().toISOString().slice(0, 10),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { indicadores, puntajes } = useMemo(
    () => calcularCupo(entrada),
    [entrada],
  )

  function setNum(campo: keyof EntradaFinanciera, valor: string) {
    const n = parseFloat(valor.replace(/[^\d.-]/g, ''))
    setEntrada((e) => ({ ...e, [campo]: Number.isFinite(n) ? n : 0 }))
  }
  function setTexto(campo: keyof EntradaFinanciera, valor: string) {
    setEntrada((e) => ({ ...e, [campo]: valor }))
  }

  async function guardar() {
    setError(null)
    setGuardando(true)
    try {
      const actualizado = await api.guardarAnalisisCupo(solicitud.id, {
        analisis: {
          entrada,
          indicadores,
          puntajes,
          cupoAprobado: cupoAprobado ? Number(cupoAprobado) : null,
          fechaDecision,
        },
        estado,
        observaciones,
      })
      onGuardado(actualizado)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-4 w-full max-w-5xl rounded-xl bg-white shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Analisis de Cupo de Credito
            </h2>
            <p className="text-sm text-slate-500">
              {solicitud.consecutivo ? `${solicitud.consecutivo} · ` : ''}
              {solicitud.cliente}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Info general */}
          <section className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-4">
            <Dato label="Cliente" valor={solicitud.cliente} />
            <Dato label="Documento" valor={solicitud.documento ?? '-'} />
            <Dato label="Telefono" valor={solicitud.telefono ?? '-'} />
            <Dato label="Tipo persona" valor={solicitud.tipoPersona ?? '-'} />
          </section>

          {/* Tipo de cliente + cualitativos */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Informacion del negocio y referencias
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Campo label="Tipo de cliente">
                <select
                  value={entrada.tipoCliente}
                  onChange={(e) =>
                    setTexto('tipoCliente', e.target.value as TipoCliente)
                  }
                  className={inputClase}
                >
                  <option value="Nuevo">Nuevo</option>
                  <option value="Antiguo">Antiguo</option>
                  <option value="N y A">Nuevo y Antiguo</option>
                </select>
              </Campo>
              <Campo label="Antiguedad">
                <SelectOpc
                  value={entrada.antiguedad}
                  opciones={OPCIONES_ANTIGUEDAD}
                  onChange={(v) => setTexto('antiguedad', v)}
                />
              </Campo>
              <Campo label="Calificacion referencias">
                <SelectOpc
                  value={entrada.calificacion}
                  opciones={OPCIONES_CALIFICACION}
                  onChange={(v) => setTexto('calificacion', v)}
                />
              </Campo>
              <Campo label="Visita ocular">
                <SelectOpc
                  value={entrada.visitaOcular}
                  opciones={OPCIONES_VISITA}
                  onChange={(v) => setTexto('visitaOcular', v)}
                />
              </Campo>
              <Campo label="Datacredito">
                <SelectOpc
                  value={entrada.datacredito}
                  opciones={OPCIONES_DATACREDITO}
                  onChange={(v) => setTexto('datacredito', v)}
                />
              </Campo>
              <Campo label="Fecha corte EEFF">
                <input
                  type="date"
                  value={entrada.fechaCorte}
                  onChange={(e) => setTexto('fechaCorte', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
          </section>

          {/* Informacion financiera */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Informacion financiera (en miles)
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <CampoNum label="Cartera" campo="cartera" entrada={entrada} onChange={setNum} />
              <CampoNum label="Inventario" campo="inventario" entrada={entrada} onChange={setNum} />
              <CampoNum label="Activo corriente" campo="activoCorriente" entrada={entrada} onChange={setNum} />
              <CampoNum label="PPE (activo fijo)" campo="ppe" entrada={entrada} onChange={setNum} />
              <CampoNum label="Proveedores" campo="proveedores" entrada={entrada} onChange={setNum} />
              <CampoNum label="Pasivo corriente" campo="pasivoCorriente" entrada={entrada} onChange={setNum} />
              <CampoNum label="Ob. fin. corto plazo" campo="obFinCortoPlazo" entrada={entrada} onChange={setNum} />
              <CampoNum label="Ob. fin. largo plazo" campo="obFinLargoPlazo" entrada={entrada} onChange={setNum} />
              <CampoNum label="Pasivo total" campo="pasivoTotal" entrada={entrada} onChange={setNum} />
              <CampoNum label="Capital" campo="capital" entrada={entrada} onChange={setNum} />
              <CampoNum label="Patrimonio" campo="patrimonio" entrada={entrada} onChange={setNum} />
              <CampoNum label="Ingresos" campo="ingresos" entrada={entrada} onChange={setNum} />
              <CampoNum label="Costo de ventas" campo="costo" entrada={entrada} onChange={setNum} />
              <CampoNum label="Gastos operativos" campo="gastos" entrada={entrada} onChange={setNum} />
              <CampoNum label="UTAI" campo="utai" entrada={entrada} onChange={setNum} />
              <CampoNum label="Intereses" campo="intereses" entrada={entrada} onChange={setNum} />
              <CampoNum label="Depreciacion" campo="depreciacion" entrada={entrada} onChange={setNum} />
              <CampoNum label="Amortizacion" campo="amortizacion" entrada={entrada} onChange={setNum} />
            </div>
          </section>

          {/* Indicadores */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Indicadores financieros
            </h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Ind label="Utilidad bruta" valor={fmt(indicadores.utilidadBruta, 0)} />
              <Ind label="Utilidad operacional" valor={fmt(indicadores.utilidadOperacional, 0)} />
              <Ind label="Activo total" valor={fmt(indicadores.activoTotal, 0)} />
              <Ind label="EBITDA" valor={fmt(indicadores.ebitda, 0)} />
              <Ind label="PPE / Activo" valor={fmt(indicadores.ppeActivo)} />
              <Ind label="(Cart+Inv) / Activo" valor={fmt(indicadores.cartInvActivo)} />
              <Ind label="Solidez" valor={fmt(indicadores.solidez)} />
              <Ind label="Liquidez" valor={fmt(indicadores.liquidez)} />
              <Ind label="Capital de trabajo" valor={fmt(indicadores.kw, 0)} />
              <Ind label="KW neto operativo" valor={fmt(indicadores.kwNetoOp, 0)} />
              <Ind label="Cartera (dias)" valor={fmt(indicadores.carteraDias, 0)} />
              <Ind label="Inventario (dias)" valor={fmt(indicadores.inventarioDias, 0)} />
              <Ind label="Ciclo operativo" valor={fmt(indicadores.cicloOperativo, 0)} />
              <Ind label="Proveedores (dias)" valor={fmt(indicadores.proveedoresDias, 0)} />
              <Ind label="Ciclo de caja" valor={fmt(indicadores.cicloCaja, 0)} />
              <Ind label="Endeudamiento" valor={pct(indicadores.endeudamiento)} />
              <Ind label="Margen bruto" valor={pct(indicadores.margenBruto)} />
              <Ind label="Margen operacional" valor={pct(indicadores.margenOp)} />
            </div>
          </section>

          {/* Puntajes */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Puntajes
              </h3>
              <div className="space-y-1.5 text-sm">
                <Fila label="Respaldo economico" valor={fmt(puntajes.respaldoEconomico)} max="/10" />
                <Fila label="Referencias comerciales" valor={fmt(puntajes.referenciasComerciales)} max="/10" />
                <Fila label="Visita ocular" valor={fmt(puntajes.visitaOcular)} max="/10" />
                <Fila label="Indicadores financieros" valor={fmt(puntajes.indicadoresFinancieros)} max="/10" />
                <Fila label="Datacredito" valor={fmt(puntajes.datacredito)} max="/10" />
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <Fila
                    label="Puntaje total ponderado"
                    valor={fmt(puntajes.total)}
                    max="/10"
                    fuerte
                  />
                  <p className="mt-1 text-right text-sm font-semibold text-brand-600">
                    {conceptoPorPuntaje(puntajes.total)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Decision del comite
              </h3>
              <div className="mb-3 rounded-md bg-brand-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Cupo sugerido: </span>
                <span className="font-semibold text-brand-700">
                  {fmtMoneda(indicadores.cupoSugerido * 1000)}
                </span>
              </div>
              <div className="space-y-3">
                <Campo label="Estado">
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className={inputClase}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Cupo aprobado (pesos)">
                  <input
                    value={cupoAprobado}
                    onChange={(e) =>
                      setCupoAprobado(e.target.value.replace(/[^\d]/g, ''))
                    }
                    inputMode="numeric"
                    data-no-upper
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Fecha de decision">
                  <input
                    type="date"
                    value={fechaDecision}
                    onChange={(e) => setFechaDecision(e.target.value)}
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Observaciones">
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className={inputClase}
                  />
                </Campo>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar analisis'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  )
}

function CampoNum({
  label,
  campo,
  entrada,
  onChange,
}: {
  label: string
  campo: keyof EntradaFinanciera
  entrada: EntradaFinanciera
  onChange: (campo: keyof EntradaFinanciera, valor: string) => void
}) {
  return (
    <Campo label={label}>
      <input
        value={String(entrada[campo] ?? 0)}
        onChange={(e) => onChange(campo, e.target.value)}
        inputMode="decimal"
        data-no-upper
        className={inputClase}
      />
    </Campo>
  )
}

function SelectOpc({
  value,
  opciones,
  onChange,
}: {
  value: string
  opciones: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClase}
    >
      <option value="">Selecciona...</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{valor}</p>
    </div>
  )
}

function Ind({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800">{valor}</p>
    </div>
  )
}

function Fila({
  label,
  valor,
  max,
  fuerte,
}: {
  label: string
  valor: string
  max: string
  fuerte?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={fuerte ? 'font-semibold text-slate-800' : 'text-slate-600'}>
        {label}
      </span>
      <span className={fuerte ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800'}>
        {valor}
        <span className="text-xs text-slate-400">{max}</span>
      </span>
    </div>
  )
}
