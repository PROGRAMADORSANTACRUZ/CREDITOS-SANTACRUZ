// Motor de calculo del "Analisis de Cupo de Credito" replicando el formato Excel.
// Todos los montos financieros se manejan en miles (igual que el Excel).

export type TipoCliente = 'Nuevo' | 'Antiguo' | 'N y A'

export const OPCIONES_ANTIGUEDAD = [
  'Mayor 5 años',
  'Entre 3 y 5 años',
  'Menor 3 años',
] as const
export const OPCIONES_CALIFICACION = ['Excelente', 'Bueno', 'Aceptable'] as const
export const OPCIONES_VISITA = ['Bueno', 'Regular', 'Malo'] as const
export const OPCIONES_DATACREDITO = [
  'Excelente -Sin Reportes-',
  'Buena -Sin Reportes Negativos < 6 meses-',
  'Buena -Sin Experiencia-',
  'Regular -Atrasos Justificados-',
  'Mala -Atrasos Injustificados-',
] as const

const DATA_MALA = 'Mala -Atrasos Injustificados-'

export interface EntradaFinanciera {
  fechaCorte: string // fecha de corte de los EEFF (YYYY-MM-DD)
  // Balance (miles)
  cartera: number
  inventario: number
  activoCorriente: number
  ppe: number
  obFinCortoPlazo: number
  proveedores: number
  pasivoCorriente: number
  obFinLargoPlazo: number
  pasivoTotal: number
  capital: number
  patrimonio: number
  // Estado de resultados (miles)
  ingresos: number
  costo: number
  gastos: number
  utai: number
  intereses: number
  depreciacion: number
  amortizacion: number
  // Cualitativos
  tipoCliente: TipoCliente
  antiguedad: string
  calificacion: string
  visitaOcular: string
  datacredito: string
}

export interface IndicadoresCupo {
  meses: number
  utilidadBruta: number
  utilidadOperacional: number
  activoTotal: number
  ppeActivo: number
  cartInvActivo: number
  solidez: number
  liquidez: number
  kw: number
  kwNetoOp: number
  carteraDias: number
  inventarioDias: number
  cicloOperativo: number
  proveedoresDias: number
  cicloCaja: number
  endeudamiento: number
  margenBruto: number
  margenOp: number
  ebitda: number
  cupoSugerido: number
}

export interface PuntajesCupo {
  respaldoEconomico: number // 0-10
  referenciasComerciales: number // 0-10 (antiguedad + calificacion)
  visitaOcular: number // 0-10
  indicadoresFinancieros: number // 0-10
  datacredito: number // 0-10
  total: number // 0-10 ponderado segun tipo de cliente
}

export interface ResultadoCupo {
  indicadores: IndicadoresCupo
  puntajes: PuntajesCupo
}

function safeDiv(a: number, b: number): number {
  if (!b || !Number.isFinite(b)) return 0
  const r = a / b
  return Number.isFinite(r) ? r : 0
}

function mesFecha(fecha: string): number {
  const d = new Date(fecha)
  const m = d.getMonth() + 1
  return Number.isFinite(m) && m >= 1 ? m : 12
}

// ------------------------------ Tablas de puntaje ------------------------------

function ptsRespaldoRatio(v: number, alto: number): number {
  if (v >= alto) return 10 / 3
  if (v >= 1) return 8 / 3
  return 0
}
function ptsCartInv(v: number): number {
  if (v >= 0.5) return 10 / 3
  if (v >= 0.3) return 8 / 3
  return 0
}
function ptsAntiguedad(v: string): number {
  if (v === 'Mayor 5 años') return 5
  if (v === 'Entre 3 y 5 años') return 4
  if (v === 'Menor 3 años') return 2.5
  return 0
}
function ptsCalificacion(v: string): number {
  if (v === 'Excelente') return 5
  if (v === 'Bueno') return 4
  if (v === 'Aceptable') return 3
  return 0
}
function ptsVisita(v: string): number {
  if (v === 'Bueno') return 10
  if (v === 'Regular') return 5
  return 0
}
function ptsDatacredito(v: string): number {
  switch (v) {
    case 'Excelente -Sin Reportes-':
      return 10
    case 'Buena -Sin Reportes Negativos < 6 meses-':
      return 8
    case 'Buena -Sin Experiencia-':
      return 5
    case 'Regular -Atrasos Justificados-':
      return 3
    default:
      return 0
  }
}
function ptsLiquidez(v: number): number {
  if (v >= 2) return 2.5
  if (v >= 1.5) return 1.75
  if (v >= 1) return 1.25
  return 0
}
function ptsCicloOperativo(v: number): number {
  if (v <= 0) return 0
  if (v <= 60) return 2.5
  if (v <= 90) return 1.75
  return 0
}
function ptsEndeudamiento(v: number): number {
  if (v <= 0.3) return 2.5
  if (v <= 0.5) return 1.75
  if (v <= 0.7) return 1.25
  return 0
}
function ptsMargenOp(v: number): number {
  if (v >= 0.1) return 2.5
  if (v >= 0.07) return 1.75
  if (v >= 0.05) return 1.25
  return 0
}

// Pesos por tipo de cliente: [respaldo, refComerciales, visita, indFinancieros, datacredito]
const PESOS: Record<TipoCliente, number[]> = {
  Nuevo: [0.4, 0.1, 0.2, 0.2, 0.1],
  Antiguo: [0.15, 0.3, 0.2, 0.2, 0.15],
  'N y A': [0.2, 0.2, 0.1, 0.3, 0.2],
}

export function calcularCupo(e: EntradaFinanciera): ResultadoCupo {
  const meses = mesFecha(e.fechaCorte)

  const utilidadBruta = e.ingresos - e.costo
  const utilidadOperacional = utilidadBruta - e.gastos
  const activoTotal = e.ppe + e.activoCorriente
  const ppeActivo = safeDiv(e.ppe, activoTotal)
  const cartInvActivo = safeDiv(e.cartera + e.inventario, activoTotal)
  const solidez = safeDiv(activoTotal, e.pasivoTotal)
  const liquidez = safeDiv(e.activoCorriente, e.pasivoCorriente)
  const kw = e.activoCorriente - e.pasivoCorriente
  const kwNetoOp = e.cartera + e.inventario - e.proveedores
  const carteraDias = safeDiv(e.cartera, e.ingresos) * 30 * meses
  const inventarioDias = safeDiv(e.inventario, e.costo) * 30 * meses
  const cicloOperativo = carteraDias + inventarioDias
  const proveedoresDias = safeDiv(e.proveedores, e.costo) * 30 * meses
  const cicloCaja = cicloOperativo - proveedoresDias
  const endeudamiento = safeDiv(e.pasivoTotal, activoTotal)
  const margenBruto = safeDiv(utilidadBruta, e.ingresos)
  const margenOp = safeDiv(utilidadOperacional, e.ingresos)
  const baseEbitda = e.utai !== 0 ? e.utai : utilidadOperacional
  const ebitda = baseEbitda + e.intereses + e.depreciacion + e.amortizacion
  const cupoSugerido = safeDiv(e.costo, meses) * 0.1

  const indicadores: IndicadoresCupo = {
    meses,
    utilidadBruta,
    utilidadOperacional,
    activoTotal,
    ppeActivo,
    cartInvActivo,
    solidez,
    liquidez,
    kw,
    kwNetoOp,
    carteraDias,
    inventarioDias,
    cicloOperativo,
    proveedoresDias,
    cicloCaja,
    endeudamiento,
    margenBruto,
    margenOp,
    ebitda,
    cupoSugerido,
  }

  const respaldoEconomico =
    ptsRespaldoRatio(ppeActivo, 1.5) +
    ptsCartInv(cartInvActivo) +
    ptsRespaldoRatio(solidez, 1.5)
  const referenciasComerciales =
    ptsAntiguedad(e.antiguedad) + ptsCalificacion(e.calificacion)
  const visitaOcular = ptsVisita(e.visitaOcular)
  const indicadoresFinancieros =
    ptsLiquidez(liquidez) +
    ptsCicloOperativo(cicloOperativo) +
    ptsEndeudamiento(endeudamiento) +
    ptsMargenOp(margenOp)
  const datacredito = ptsDatacredito(e.datacredito)

  const pesos = PESOS[e.tipoCliente] ?? PESOS.Nuevo
  const componentes = [
    respaldoEconomico,
    referenciasComerciales,
    visitaOcular,
    indicadoresFinancieros,
    datacredito,
  ]
  const total =
    e.datacredito === DATA_MALA
      ? 0
      : componentes.reduce((acc, c, i) => acc + c * pesos[i], 0)

  const puntajes: PuntajesCupo = {
    respaldoEconomico,
    referenciasComerciales,
    visitaOcular,
    indicadoresFinancieros,
    datacredito,
    total,
  }

  return { indicadores, puntajes }
}

export function conceptoPorPuntaje(total: number): string {
  if (total >= 8) return 'Excelente'
  if (total >= 6) return 'Bueno'
  if (total >= 4) return 'Aceptable'
  return 'Malo'
}

export const ENTRADA_FINANCIERA_VACIA: EntradaFinanciera = {
  fechaCorte: '',
  cartera: 0,
  inventario: 0,
  activoCorriente: 0,
  ppe: 0,
  obFinCortoPlazo: 0,
  proveedores: 0,
  pasivoCorriente: 0,
  obFinLargoPlazo: 0,
  pasivoTotal: 0,
  capital: 0,
  patrimonio: 0,
  ingresos: 0,
  costo: 0,
  gastos: 0,
  utai: 0,
  intereses: 0,
  depreciacion: 0,
  amortizacion: 0,
  tipoCliente: 'Nuevo',
  antiguedad: '',
  calificacion: '',
  visitaOcular: '',
  datacredito: '',
}
