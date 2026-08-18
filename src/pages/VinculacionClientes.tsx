import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaVinculacionCliente } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  DEPARTAMENTOS,
  DEPARTAMENTOS_MUNICIPIOS,
} from '../data/colombiaUbicaciones'
import { SelectorBuscable } from '../components/SelectorBuscable'
import { CapturaFoto } from '../components/CapturaFoto'
import { FirmaModal } from '../components/FirmaModal'
import type { VinculacionCliente } from '../types/trazabilidad'

// --------------------------------------------------------------------------
// Modelo del formato F-FIN-01 (Formato de Vinculacion de Clientes,
// multi-seccion). Todo el detalle se guarda en el campo `datos` (JSONB);
// los campos resumen (cliente, documento, etc.) se derivan para el listado.
// --------------------------------------------------------------------------

interface Accionista {
  nombre: string
  tipoDocumento: string
  numero: string
}
interface Referencia {
  nombre: string
  direccion: string
  ciudad: string
  telefono: string
}

// Documento adjuntado por el cliente (JPG o PDF) guardado como data URL.
interface DocumentoCargado {
  nombre: string
  tipo: string
  contenido: string
}
interface DocRequerido {
  id: string
  label: string
  opcional?: boolean
}

interface FormDatos {
  empresa: string
  tipoSolicitud: string
  tipoCredito: string
  tipoPersona: string
  fecha: string
  ciudad: string
  municipio: string
  // 1. Informacion general
  nombreRazonSocial: string
  nombreRepLegal: string
  repNombres: string
  repApellidos: string
  repTipoIdentificacion: string
  repNumeroIdentificacion: string
  repFechaExpedicion: string
  repTelefono: string
  repCorreo: string
  repPorcentajeParticipacion: string
  repFoto: string
  repFirma: string
  tipoPersonaJuridica: string
  fechaNacimiento: string
  tipoIdentificacion: string
  numeroIdentificacion: string
  edad: string
  direccion: string
  barrio: string
  fechaConstitucion: string
  fechaExpedicion: string
  lugarExpedicion: string
  ciudadContacto: string
  telefono: string
  celular: string
  email: string
  // 2. Accionistas
  accionistas: Accionista[]
  // 3. Informacion tributaria
  tipoActividad: string
  codigoCIIU: string
  ciiuPrincipal: string
  ciiuSecundaria: string
  descripcionActividad: string
  codigoICA: string
  icaPrincipal: string
  icaSecundaria: string
  regimen: string
  granContribuyente: string
  granContribResolucion: string
  granContribFecha: string
  autorretenedor: string
  autorretResolucion: string
  autorretFecha: string
  exentoRetencion: string
  exentoResolucion: string
  exentoFecha: string
  retenedorICA: string
  retICAResolucion: string
  retICAFecha: string
  // 4. Facturacion electronica
  emailFE: string
  responsableFE: string
  telefonoFE: string
  // 5. Informacion para pagos
  pagosNombre: string
  pagosCelular: string
  pagosCargo: string
  pagosTelefono: string
  // 6. Referencias
  referenciasComerciales: Referencia[]
  referenciasPersonales: Referencia[]
  // 7. Informacion financiera
  activos: string
  ingresosMensuales: string
  conceptoIngresos: string
  pasivos: string
  costosGastos: string
  patrimonio: string
  otrosIngresos: string
  conceptoOtrosIngresos: string
  // 9. Beneficiario final
  bfNombre: string
  bfTipoDocumento: string
  bfNumero: string
  bfFechaNacimiento: string
  bfNacionalidad: string
  bfPaisResidencia: string
  bfCelular: string
  bfDireccion: string
  // Autorizaciones
  autorizaDatos: boolean
  autorizaCentrales: boolean
  declaraVeracidad: boolean
  autorizaListas: boolean
  aceptaIntegral: boolean
  aceptaTrazabilidad: boolean
  // Documentos adjuntos segun el tipo de credito
  documentos: Record<string, DocumentoCargado>
}

const EMPRESAS = [
  'Carnes Santacruz SAS',
  'Agropecuaria Santacruz Ltda',
  'Inversiones Serrano Millan',
  'Agroporcicola Santacruz',
  'Transantacruz',
]

// Nombre legal (razon social) usado en autorizaciones y declaraciones segun empresa.
const NOMBRE_LEGAL_EMPRESA: Record<string, string> = {
  'Carnes Santacruz SAS': 'Carnes Santacruz S.A.S.',
  'Agropecuaria Santacruz Ltda': 'Agropecuaria Santacruz Ltda.',
  'Inversiones Serrano Millan': 'Inversiones Serrano Millán S.A.S.',
  'Agroporcicola Santacruz': 'Agroporcícola Santacruz S.A.S.',
  Transantacruz: 'Transantacruz S.A.S.',
}

// Devuelve la razon social de la empresa seleccionada (o un valor por defecto).
function nombreLegal(empresa: string): string {
  return NOMBRE_LEGAL_EMPRESA[empresa] ?? 'Carnes Santacruz S.A.S.'
}

// Color de resaltado por empresa cuando esta seleccionada.
const COLORES_EMPRESA: Record<string, string> = {
  'Carnes Santacruz SAS': 'border-[#c1122f] bg-[#c1122f] text-white',
  'Agropecuaria Santacruz Ltda': 'border-[#4a7c1f] bg-[#4a7c1f] text-white',
  'Inversiones Serrano Millan': 'border-[#6d1a2e] bg-[#6d1a2e] text-white',
  'Agroporcicola Santacruz': 'border-pink-500 bg-pink-500 text-white',
}

// Tema (paleta brand) que adopta el formulario segun la empresa seleccionada.
const TEMA_EMPRESA: Record<string, Record<string, string>> = {
  'Carnes Santacruz SAS': {
    '--brand-50': '#fef2f2',
    '--brand-100': '#fee2e2',
    '--brand-500': '#e11d48',
    '--brand-600': '#c1122f',
    '--brand-700': '#9b0f26',
  },
  'Agropecuaria Santacruz Ltda': {
    '--brand-50': '#f7fee7',
    '--brand-100': '#ecfccb',
    '--brand-500': '#65a30d',
    '--brand-600': '#4a7c1f',
    '--brand-700': '#3a6318',
  },
  'Inversiones Serrano Millan': {
    '--brand-50': '#fdf2f4',
    '--brand-100': '#fce7ea',
    '--brand-500': '#9b1b30',
    '--brand-600': '#6d1a2e',
    '--brand-700': '#551423',
  },
  'Agroporcicola Santacruz': {
    '--brand-50': '#fdf2f8',
    '--brand-100': '#fce7f3',
    '--brand-500': '#f472b6',
    '--brand-600': '#ec4899',
    '--brand-700': '#db2777',
  },
  Transantacruz: {
    '--brand-50': '#eff6ff',
    '--brand-100': '#dbeafe',
    '--brand-500': '#3b82f6',
    '--brand-600': '#2563eb',
    '--brand-700': '#1d4ed8',
  },
}
const TIPOS_SOLICITUD = [
  'Contado',
  'Credito',
  'Actualizacion Datos',
  'Ampliacion de Cupo',
]
const TIPOS_CREDITO = [
  'Express - 1 SMMLV - de 1 a 3 dias',
  'Santacruz - 2 a 10 SMMLV - de 8 a 15 dias',
  'Especial - 100 SMMLV - de 15 a 30 dias',
]

// Documentos requeridos segun el tipo de credito seleccionado.
const DOCS_POR_CREDITO: { prefijo: string; docs: DocRequerido[] }[] = [
  {
    prefijo: 'Express',
    docs: [
      { id: 'formularioVinculacion', label: 'Formulario vinculacion' },
      {
        id: 'docIdentificacion',
        label: 'Fotocopia documento de identificacion',
      },
      { id: 'rut', label: 'RUT no mayor a 30 dias de impresion' },
      {
        id: 'camaraComercio',
        label: 'Certificado de camara de comercio no mayor a 30 dias',
      },
    ],
  },
  {
    prefijo: 'Santacruz',
    docs: [
      { id: 'formularioVinculacion', label: 'Formulario vinculacion' },
      {
        id: 'docIdentificacion',
        label: 'Fotocopia documento de identificacion',
      },
      { id: 'rut', label: 'RUT no mayor a 30 dias de impresion' },
      {
        id: 'composicionAccionaria',
        label: 'Composicion accionaria (si aplica)',
        opcional: true,
      },
      { id: 'referenciasComerciales', label: '2 referencias comerciales' },
      {
        id: 'facturasCompra',
        label: '2 facturas de compra no mayor a 30 dias',
      },
      {
        id: 'camaraComercio',
        label: 'Certificado de camara de comercio no mayor a 30 dias',
      },
    ],
  },
  {
    prefijo: 'Especial',
    docs: [
      { id: 'formularioVinculacion', label: 'Formulario vinculacion' },
      {
        id: 'docIdentificacion',
        label: 'Fotocopia documento de identificacion',
      },
      { id: 'rut', label: 'RUT' },
      { id: 'referenciasComerciales', label: '2 referencias comerciales' },
      {
        id: 'camaraComercio',
        label: 'Certificado de camara de comercio no mayor a 30 dias',
      },
      {
        id: 'estadosFinancieros',
        label:
          'Estados financieros a corte y del anio anterior firmados por contador y/o revisor fiscal',
      },
      {
        id: 'declaracionRenta',
        label: 'Declaracion de renta del anio anterior',
      },
      {
        id: 'declaracionIva',
        label: 'Declaracion de IVA y/o ipoconsumo anio actual',
      },
      {
        id: 'pagareCarta',
        label:
          'Pagare en blanco y carta de instrucciones para diligenciar pagare',
      },
      {
        id: 'composicionAccionaria',
        label:
          'Composicion accionaria hasta beneficiario final persona natural',
      },
    ],
  },
]

function docsRequeridos(tipoCredito: string): DocRequerido[] {
  const encontrado = DOCS_POR_CREDITO.find((d) =>
    tipoCredito.startsWith(d.prefijo),
  )
  return encontrado?.docs ?? []
}

// Finalidades del tratamiento de datos (Ley 1581 de 2012) mostradas en el modal.
const FINALIDADES_DATOS = [
  'Adelantar procesos de vinculación, actualización y conocimiento de contrapartes.',
  'Verificar la identidad de la persona natural, empresa, representante legal, socios, accionistas, administradores, beneficiarios finales y demás vinculados.',
  'Evaluar la viabilidad de establecer, mantener, modificar, suspender o terminar una relación comercial, contractual o jurídica.',
  'Gestionar procesos comerciales, administrativos, crediticios, cartera, recaudo, facturación, pagos, referencias, certificaciones y trazabilidad documental.',
  'Cumplir obligaciones legales, contractuales, contables, tributarias, comerciales, administrativas y de cumplimiento.',
  'Ejecutar procedimientos de debida diligencia, debida diligencia intensificada y monitoreo continuo bajo el SAGRILAFT y las políticas internas LA/FT/FPADM de {{EMPRESA}}.',
  'Consultar, verificar y actualizar información en fuentes públicas, privadas, registros oficiales, bases de datos, listas vinculantes, restrictivas, sancionatorias, PEP, antecedentes, prensa y herramientas de cumplimiento.',
  'Atender requerimientos de autoridades judiciales, administrativas, tributarias, de inspección, vigilancia y control.',
  'Conservar evidencia documental y electrónica del proceso de vinculación, actualización, monitoreo, evaluación y gestión de riesgos.',
  'Contactar a la contraparte por medios físicos, telefónicos, electrónicos, mensajería instantánea o cualquier otro canal informado, para asuntos relacionados con la relación comercial, contractual o de cumplimiento.',
]

// Finalidades del reporte en centrales de riesgo (Ley 1266 de 2008 / 2157 de 2021).
const FINALIDADES_CENTRALES = [
  'Evaluar la viabilidad de otorgar, mantener, modificar, suspender o cancelar condiciones de crédito.',
  'Realizar estudios de crédito, comportamiento de pago, capacidad financiera, nivel de endeudamiento y perfil comercial.',
  'Consultar historial crediticio, financiero, comercial y de servicios.',
  'Verificar referencias comerciales, bancarias, financieras y de proveedores.',
  'Monitorear el cumplimiento de obligaciones comerciales, facturas, créditos, acuerdos de pago, cupos y plazos autorizados.',
  'Reportar información positiva o negativa relacionada con el nacimiento, ejecución, modificación, incumplimiento, mora, pago, extinción o terminación de obligaciones comerciales, crediticias o de servicios.',
  'Compartir información con operadores de bancos de datos, centrales de riesgo y terceros autorizados, para fines de análisis, administración y control del riesgo crediticio.',
  'Realizar gestión de cobranza, recuperación de cartera, acuerdos de pago, seguimiento de mora y control de cupos.',
  'Cumplir obligaciones legales, contractuales, comerciales, administrativas y de debida diligencia.',
]

// Declaracion de origen de fondos / SAGRILAFT (declaracion #3).
const DECLARACIONES_FONDOS = [
  'Mi actividad económica y/o la actividad económica de la empresa que represento es lícita, verificable y coherente con la información suministrada a {{EMPRESA}}.',
  'Los ingresos, recursos y fondos utilizados en operaciones con {{EMPRESA}} tienen origen lícito y podrán ser soportados documentalmente cuando la compañía lo requiera.',
  'No utilizaré la relación comercial con {{EMPRESA}} para ocultar, administrar, transformar, transportar, invertir, custodiar, canalizar o legalizar recursos de origen ilícito.',
  'Me comprometo a actualizar la información financiera, comercial, tributaria, societaria y de beneficiario final cuando se presenten cambios relevantes o cuando {{EMPRESA}} lo solicite.',
  'Me obligo a informar oportunamente cualquier cambio en mi actividad económica, composición accionaria, beneficiario final, representante legal, dirección, situación financiera, capacidad de pago o condición jurídica que pueda afectar la relación comercial.',
  'Autorizo a {{EMPRESA}} a solicitar soportes adicionales cuando existan señales de alerta, inconsistencias documentales, operaciones inusuales, cambios significativos en el perfil transaccional o necesidad de debida diligencia intensificada.',
  'Entiendo que la negativa injustificada a entregar información o la entrega de documentos falsos, alterados, incompletos, vencidos o inconsistentes podrá dar lugar al rechazo de la vinculación, suspensión de la relación comercial, bloqueo de cupo, terminación contractual y/o reporte interno al Oficial de Cumplimiento.',
]

// Consultas en listas vinculantes / PEP (autorizacion #4).
const LISTAS_VERIFICACION = [
  'La persona natural o jurídica vinculada.',
  'La empresa, establecimiento de comercio o tercero relacionado.',
  'Representante legal principal y suplente.',
  'Socios, accionistas, asociados o propietarios.',
  'Beneficiarios finales y controlantes directos o indirectos.',
  'Miembros de junta directiva, administradores, revisores fiscales y principales cargos directivos.',
  'Contactos comerciales, financieros, contables, autorizados de pago, compradores, negociadores o terceros relacionados con la operación.',
  'Personas naturales o jurídicas que actúen en nombre, por cuenta o en beneficio de la contraparte.',
  'Empresas vinculadas, subordinadas, matrices, filiales, controlantes, consorcios, uniones temporales o estructuras relacionadas, cuando aplique.',
]
const LISTAS_FUENTES = [
  'Listas del Consejo de Seguridad de las Naciones Unidas.',
  'Listas OFAC / SDN.',
  'Listas de la Unión Europea.',
  'Listas del Reino Unido.',
  'Listas nacionales o internacionales vinculantes para Colombia.',
  'Bases PEP nacionales y extranjeras.',
  'Antecedentes judiciales, disciplinarios, fiscales, sancionatorios o administrativos.',
  'Registros públicos nacionales e internacionales.',
  'Prensa negativa, fuentes abiertas y medios de comunicación.',
  'Plataformas de debida diligencia, listas restrictivas y monitoreo contratadas por la compañía.',
  'Información relacionada con beneficiarios finales, cuando aplique y sea procedente conforme a la ley.',
]
const TIPOS_PERSONA = ['Persona Natural', 'Persona Juridica']
const TIPOS_DOC = ['CC', 'CE', 'NIT', 'TI']
const TIPOS_PERSONA_JURIDICA = ['S.A.S', 'Ilimitada', 'S.A', 'Unipersonal', 'Otros']
const TIPOS_ACTIVIDAD = ['Comercial', 'Servicios', 'Industrial']
const REGIMENES = [
  'Responsable de IVA',
  'No Responsable de IVA',
  'Regimen Simple de Tributacion',
]
const SI_NO = ['Si', 'No']
const ESTADOS = ['Pendiente', 'Aprobado', 'Rechazado']

const refVacia = (): Referencia => ({
  nombre: '',
  direccion: '',
  ciudad: '',
  telefono: '',
})

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const datosVacio = (): FormDatos => ({
  empresa: '',
  tipoSolicitud: '',
  tipoCredito: '',
  tipoPersona: '',
  fecha: hoy(),
  ciudad: '',
  municipio: '',
  nombreRazonSocial: '',
  nombreRepLegal: '',
  repNombres: '',
  repApellidos: '',
  repTipoIdentificacion: '',
  repNumeroIdentificacion: '',
  repFechaExpedicion: hoy(),
  repTelefono: '',
  repCorreo: '',
  repPorcentajeParticipacion: '',
  repFoto: '',
  repFirma: '',
  tipoPersonaJuridica: '',
  fechaNacimiento: '',
  tipoIdentificacion: '',
  numeroIdentificacion: '',
  edad: '',
  direccion: '',
  barrio: '',
  fechaConstitucion: hoy(),
  fechaExpedicion: '',
  lugarExpedicion: '',
  ciudadContacto: '',
  telefono: '',
  celular: '',
  email: '',
  accionistas: [],
  tipoActividad: '',
  codigoCIIU: '',
  ciiuPrincipal: '',
  ciiuSecundaria: '',
  descripcionActividad: '',
  codigoICA: '',
  icaPrincipal: '',
  icaSecundaria: '',
  regimen: '',
  granContribuyente: '',
  granContribResolucion: '',
  granContribFecha: '',
  autorretenedor: '',
  autorretResolucion: '',
  autorretFecha: '',
  exentoRetencion: '',
  exentoResolucion: '',
  exentoFecha: '',
  retenedorICA: '',
  retICAResolucion: '',
  retICAFecha: '',
  emailFE: '',
  responsableFE: '',
  telefonoFE: '',
  pagosNombre: '',
  pagosCelular: '',
  pagosCargo: '',
  pagosTelefono: '',
  referenciasComerciales: [refVacia()],
  referenciasPersonales: [refVacia()],
  activos: '',
  ingresosMensuales: '',
  conceptoIngresos: '',
  pasivos: '',
  costosGastos: '',
  patrimonio: '',
  otrosIngresos: '',
  conceptoOtrosIngresos: '',
  bfNombre: '',
  bfTipoDocumento: 'CC',
  bfNumero: '',
  bfFechaNacimiento: '',
  bfNacionalidad: '',
  bfPaisResidencia: '',
  bfCelular: '',
  bfDireccion: '',
  autorizaDatos: false,
  autorizaCentrales: false,
  declaraVeracidad: false,
  autorizaListas: false,
  aceptaIntegral: false,
  aceptaTrazabilidad: false,
  documentos: {},
})

function fmtFecha(valor?: string): string {
  if (!valor) return '-'
  const [a, m, d] = valor.slice(0, 10).split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

function colorEstado(estado?: string): string {
  switch (estado) {
    case 'Aprobado':
      return 'bg-green-100 text-green-700'
    case 'Rechazado':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function VinculacionClientes() {
  const [registros, setRegistros] = useState<VinculacionCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [datos, setDatos] = useState<FormDatos>(datosVacio)
  const [estado, setEstado] = useState('Pendiente')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalDatos, setModalDatos] = useState(false)
  const [modalCentrales, setModalCentrales] = useState(false)
  const [modalFondos, setModalFondos] = useState(false)
  const [modalListas, setModalListas] = useState(false)
  const [modalIntegral, setModalIntegral] = useState(false)
  const [modalTrazabilidad, setModalTrazabilidad] = useState(false)
  const [modalFoto, setModalFoto] = useState(false)
  const [modalFirma, setModalFirma] = useState(false)

  const [aEliminar, setAEliminar] = useState<VinculacionCliente | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getVinculacionClientes())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar las vinculaciones',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const esPersonaJuridica = datos.tipoPersona === 'Persona Juridica'

  const formValido = useMemo(
    () =>
      datos.nombreRazonSocial.trim() !== '' &&
      datos.tipoIdentificacion !== '' &&
      datos.numeroIdentificacion.trim() !== '' &&
      (datos.tipoPersona !== 'Persona Juridica' ||
        (datos.tipoPersonaJuridica.trim() !== '' &&
          datos.fechaConstitucion.trim() !== '')) &&
      datos.direccion.trim() !== '' &&
      datos.barrio.trim() !== '' &&
      datos.email.trim() !== '' &&
      datos.autorizaDatos &&
      datos.autorizaCentrales &&
      datos.declaraVeracidad &&
      datos.autorizaListas &&
      datos.aceptaIntegral &&
      datos.aceptaTrazabilidad,
    [datos],
  )

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (filtroEstado && (r.estado ?? '') !== filtroEstado) return false
      if (!t) return true
      return (
        r.cliente.toLowerCase().includes(t) ||
        (r.documento ?? '').toLowerCase().includes(t) ||
        (r.telefono ?? '').toLowerCase().includes(t) ||
        (r.consecutivo ?? '').toLowerCase().includes(t)
      )
    })
  }, [registros, busqueda, filtroEstado])

  const kpis = useMemo(() => {
    let pendientes = 0
    let aprobados = 0
    let naturales = 0
    registros.forEach((r) => {
      if (r.estado === 'Aprobado') aprobados += 1
      else if (r.estado !== 'Rechazado') pendientes += 1
      if ((r.tipoPersona ?? '').startsWith('Persona Natural')) naturales += 1
    })
    return { total: registros.length, pendientes, aprobados, naturales }
  }, [registros])

  function set<K extends keyof FormDatos>(campo: K, valor: FormDatos[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  function setAccionista(i: number, campo: keyof Accionista, valor: string) {
    setDatos((prev) => {
      const arr = prev.accionistas.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, accionistas: arr }
    })
  }
  function addAccionista() {
    setDatos((prev) => ({
      ...prev,
      accionistas: [
        ...prev.accionistas,
        { nombre: '', tipoDocumento: 'CC', numero: '' },
      ],
    }))
  }
  function delAccionista(i: number) {
    setDatos((prev) => ({
      ...prev,
      accionistas: prev.accionistas.filter((_, j) => j !== i),
    }))
  }

  function setRef(
    lista: 'referenciasComerciales' | 'referenciasPersonales',
    i: number,
    campo: keyof Referencia,
    valor: string,
  ) {
    setDatos((prev) => {
      const arr = prev[lista].slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, [lista]: arr }
    })
  }
  function addRef(lista: 'referenciasComerciales' | 'referenciasPersonales') {
    setDatos((prev) => ({ ...prev, [lista]: [...prev[lista], refVacia()] }))
  }
  function delRef(
    lista: 'referenciasComerciales' | 'referenciasPersonales',
    i: number,
  ) {
    setDatos((prev) => ({
      ...prev,
      [lista]: prev[lista].filter((_, j) => j !== i),
    }))
  }

  function cargarDocumento(id: string, file: File | null) {
    if (!file) return
    const permitido = ['image/jpeg', 'image/jpg', 'application/pdf']
    if (!permitido.includes(file.type)) {
      setErrorForm('Solo se permiten archivos JPG o PDF.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const contenido = reader.result as string
      setDatos((prev) => ({
        ...prev,
        documentos: {
          ...prev.documentos,
          [id]: { nombre: file.name, tipo: file.type, contenido },
        },
      }))
    }
    reader.readAsDataURL(file)
  }
  function quitarDocumento(id: string) {
    setDatos((prev) => {
      const rest = { ...prev.documentos }
      delete rest[id]
      return { ...prev, documentos: rest }
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setDatos(datosVacio())
    setEstado('Pendiente')
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abrirEdicion(r: VinculacionCliente) {
    setEditandoId(r.id)
    const base = datosVacio()
    const d = (r.datos ?? {}) as Partial<FormDatos>
    setDatos({
      ...base,
      ...d,
      accionistas: d.accionistas ?? base.accionistas,
      referenciasComerciales:
        d.referenciasComerciales ?? base.referenciasComerciales,
      referenciasPersonales:
        d.referenciasPersonales ?? base.referenciasPersonales,
      documentos: d.documentos ?? base.documentos,
      fecha: r.fecha ?? base.fecha,
      tipoPersona: r.tipoPersona ?? d.tipoPersona ?? base.tipoPersona,
      tipoSolicitud: r.tipoSolicitud ?? d.tipoSolicitud ?? base.tipoSolicitud,
      nombreRazonSocial: r.cliente ?? d.nombreRazonSocial ?? '',
      numeroIdentificacion: r.documento ?? d.numeroIdentificacion ?? '',
    })
    setEstado(r.estado ?? 'Pendiente')
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    if (!datos.tipoIdentificacion) {
      setErrorForm('Debes seleccionar el tipo de identificacion para continuar.')
      return
    }
    if (!datos.numeroIdentificacion.trim()) {
      setErrorForm('Debes ingresar el numero de identificacion para continuar.')
      return
    }
    if (!datos.nombreRazonSocial.trim()) {
      setErrorForm('Debes ingresar el nombre completo o razon social para continuar.')
      return
    }
    if (esPersonaJuridica && !datos.tipoPersonaJuridica.trim()) {
      setErrorForm('Debes indicar el tipo de persona juridica para continuar.')
      return
    }
    if (esPersonaJuridica && !datos.fechaConstitucion.trim()) {
      setErrorForm('Debes ingresar la fecha de constitucion de la empresa para continuar.')
      return
    }
    if (!datos.direccion.trim()) {
      setErrorForm('Debes ingresar la direccion para continuar.')
      return
    }
    if (!datos.barrio.trim()) {
      setErrorForm('Debes ingresar el barrio para continuar.')
      return
    }
    if (!datos.email.trim()) {
      setErrorForm('Debes ingresar el correo para continuar.')
      return
    }
    if (!datos.autorizaDatos) {
      setErrorForm(
        'Debes aceptar la autorizacion para el tratamiento de datos personales para continuar.',
      )
      return
    }
    if (!datos.autorizaCentrales) {
      setErrorForm(
        'Debes aceptar la autorizacion para consultar y reportar en centrales de riesgo para continuar.',
      )
      return
    }
    if (!datos.declaraVeracidad) {
      setErrorForm(
        'Debes aceptar la declaracion de origen de fondos y actividad economica para continuar.',
      )
      return
    }
    if (!datos.autorizaListas) {
      setErrorForm(
        'Debes aceptar la autorizacion de consultas en listas vinculantes y PEP para continuar.',
      )
      return
    }
    if (!datos.aceptaIntegral) {
      setErrorForm(
        'Debes aceptar integralmente las autorizaciones y declaraciones del formulario para continuar.',
      )
      return
    }
    if (!datos.aceptaTrazabilidad) {
      setErrorForm(
        'Debes aceptar la aceptacion electronica mediante link de acceso y la trazabilidad para continuar.',
      )
      return
    }
    if (!formValido) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const payload: NuevaVinculacionCliente = {
        fecha: datos.fecha || undefined,
        cliente: datos.nombreRazonSocial.trim(),
        documento: datos.numeroIdentificacion.trim() || undefined,
        telefono: datos.telefono.trim() || datos.celular.trim() || undefined,
        direccion: datos.direccion.trim() || undefined,
        tipoPersona: datos.tipoPersona || undefined,
        tipoSolicitud: datos.tipoSolicitud || undefined,
        estado,
        observaciones: undefined,
        datos: datos as unknown as Record<string, unknown>,
      }
      if (editandoId) {
        const actualizado = await api.actualizarVinculacionCliente(
          editandoId,
          payload,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearVinculacionCliente(payload)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la vinculacion',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarVinculacionCliente(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la vinculacion',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div
      className="space-y-6"
      style={TEMA_EMPRESA[datos.empresa] as React.CSSProperties | undefined}
    >
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Solicitud de credito
          </h2>
          <p className="text-slate-500">
            Formato F-FIN-01 &mdash; Carnes Santacruz S.A.S.
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nueva solicitud de credito
          </button>
        )}
      </header>

      {!mostrarForm && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi titulo="Vinculaciones" valor={kpis.total} />
          <Kpi titulo="Pendientes" valor={kpis.pendientes} />
          <Kpi titulo="Aprobadas" valor={kpis.aprobados} />
          <Kpi titulo="Persona natural" valor={kpis.naturales} />
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="space-y-6">
          {/* Encabezado del formulario */}
          <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-brand-100 bg-brand-50 px-6 py-4">
              <img
                src="/logo.jpg"
                alt="Carnes Santacruz"
                className="h-12 w-auto rounded"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editandoId ? 'Editar solicitud' : 'Nueva solicitud'} de
                  credito
                </h3>
                <p className="text-xs text-slate-500">
                  F-FIN-01 &middot; Version 01
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <Campo label="Empresa">
                <Pills
                  opciones={EMPRESAS}
                  value={datos.empresa}
                  onChange={(v) => set('empresa', v)}
                  colores={COLORES_EMPRESA}
                />
              </Campo>
              <Campo label="Tipo de solicitud">
                <Pills
                  opciones={TIPOS_SOLICITUD}
                  value={datos.tipoSolicitud}
                  onChange={(v) => set('tipoSolicitud', v)}
                />
              </Campo>
              <Campo label="Tipo de credito solicitado">
                <Pills
                  opciones={TIPOS_CREDITO}
                  value={datos.tipoCredito}
                  onChange={(v) => set('tipoCredito', v)}
                />
              </Campo>
              <Campo label="Tipo de persona">
                <Pills
                  opciones={TIPOS_PERSONA}
                  value={datos.tipoPersona}
                  onChange={(v) => set('tipoPersona', v)}
                />
              </Campo>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Campo label="Fecha Solicitud Credito">
                  <input
                    type="date"
                    value={datos.fecha}
                    onChange={(e) => set('fecha', e.target.value)}
                    className={inputClase}
                  />
                </Campo>
              </div>
            </div>
          </div>

          {/* 1. Informacion general */}
          <Seccion numero={1} titulo="Informacion general">
            <h4 className="text-sm font-semibold text-slate-700">
              {esPersonaJuridica ? 'Datos de la empresa' : 'Datos personales'}
            </h4>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div className="grid grid-cols-3 gap-2">
                <Campo label="T.I. *" className="col-span-1">
                  <select
                    value={datos.tipoIdentificacion}
                    onChange={(e) => set('tipoIdentificacion', e.target.value)}
                    className={inputClase}
                  >
                    <option value="">Seleccione...</option>
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Identificacion *" className="col-span-2">
                  <input
                    value={datos.numeroIdentificacion}
                    onChange={(e) => set('numeroIdentificacion', e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    data-no-upper
                    className={inputClase}
                  />
                </Campo>
              </div>
              <Campo label="Nombre completo o razon social *">
                <input
                  value={datos.nombreRazonSocial}
                  onChange={(e) => set('nombreRazonSocial', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              {esPersonaJuridica && (
                <Campo label="Tipo de persona juridica *">
                  <SelectorBuscable
                    value={datos.tipoPersonaJuridica}
                    onChange={(v) => set('tipoPersonaJuridica', v)}
                    opciones={TIPOS_PERSONA_JURIDICA}
                    placeholder="Selecciona"
                    editable
                  />
                </Campo>
              )}
              {esPersonaJuridica && (
                <Campo label="Fecha de constitucion empresa *">
                  <input
                    type="date"
                    value={datos.fechaConstitucion}
                    onChange={(e) => set('fechaConstitucion', e.target.value)}
                    className={inputClase}
                  />
                </Campo>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Direccion *">
                <input
                  value={datos.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Barrio *">
                <input
                  value={datos.barrio}
                  onChange={(e) => set('barrio', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Departamento">
                <SelectorBuscable
                  value={datos.ciudad}
                  onChange={(v) =>
                    setDatos((d) => ({ ...d, ciudad: v, municipio: '' }))
                  }
                  opciones={DEPARTAMENTOS}
                  placeholder="Selecciona"
                />
              </Campo>
              <Campo label="Municipio">
                <SelectorBuscable
                  value={datos.municipio}
                  onChange={(v) => set('municipio', v)}
                  opciones={DEPARTAMENTOS_MUNICIPIOS[datos.ciudad] || []}
                  disabled={!datos.ciudad}
                  placeholder="Selecciona"
                  disabledText="Selecciona"
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Celular">
                <input
                  value={datos.celular}
                  onChange={(e) => set('celular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono">
                <input
                  value={datos.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Correo *">
                <input
                  type="email"
                  value={datos.email}
                  onChange={(e) => set('email', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <h4 className="pt-2 text-sm font-semibold text-slate-700">
              Datos representante legal
            </h4>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div className="grid grid-cols-3 gap-2">
                <Campo label="T.I." className="col-span-1">
                  <select
                    value={datos.repTipoIdentificacion}
                    onChange={(e) => set('repTipoIdentificacion', e.target.value)}
                    className={inputClase}
                  >
                    <option value="">Seleccione...</option>
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Identificacion" className="col-span-2">
                  <input
                    value={datos.repNumeroIdentificacion}
                    onChange={(e) =>
                      set('repNumeroIdentificacion', e.target.value.replace(/\D/g, ''))
                    }
                    inputMode="numeric"
                    data-no-upper
                    className={inputClase}
                  />
                </Campo>
              </div>
              <Campo label="Fecha de expedicion">
                <input
                  type="date"
                  value={datos.repFechaExpedicion}
                  onChange={(e) => set('repFechaExpedicion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Nombres">
                <input
                  value={datos.repNombres}
                  onChange={(e) => set('repNombres', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Apellidos">
                <input
                  value={datos.repApellidos}
                  onChange={(e) => set('repApellidos', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Telefono">
                <input
                  value={datos.repTelefono}
                  onChange={(e) => set('repTelefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Correo">
                <input
                  type="email"
                  value={datos.repCorreo}
                  onChange={(e) => set('repCorreo', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="% Participacion Asociada">
                <input
                  value={datos.repPorcentajeParticipacion}
                  onChange={(e) =>
                    set('repPorcentajeParticipacion', e.target.value.replace(/[^\d.]/g, ''))
                  }
                  inputMode="decimal"
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Foto del rostro">
                {datos.repFoto ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={datos.repFoto}
                      alt="Foto del rostro"
                      className="h-20 w-20 rounded-md border border-slate-300 object-cover"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalFoto(true)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => set('repFoto', '')}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalFoto(true)}
                    className="flex h-20 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600"
                  >
                    📷 Tomar foto con la camara
                  </button>
                )}
              </Campo>
              <Campo label="Firma">
                {datos.repFirma ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={datos.repFirma}
                      alt="Firma"
                      className="h-20 w-40 rounded-md border border-slate-300 bg-white object-contain"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalFirma(true)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => set('repFirma', '')}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setModalFirma(true)}
                    className="flex h-20 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600"
                  >
                    ✍️ Firmar con el dedo
                  </button>
                )}
              </Campo>
            </div>
          </Seccion>

          {/* 2. Accionistas */}
          <Seccion
            numero={2}
            titulo="Accionistas o asociados (mas del 5% de participacion)"
          >
            <div className="space-y-3">
              {datos.accionistas.length === 0 && (
                <p className="text-sm text-slate-400">
                  Sin accionistas registrados.
                </p>
              )}
              {datos.accionistas.map((a, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_140px_1fr_auto]"
                >
                  <input
                    value={a.nombre}
                    onChange={(e) => setAccionista(i, 'nombre', e.target.value)}
                    placeholder="Nombre y/o razon social"
                    className={inputClase}
                  />
                  <select
                    value={a.tipoDocumento}
                    onChange={(e) =>
                      setAccionista(i, 'tipoDocumento', e.target.value)
                    }
                    className={inputClase}
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={a.numero}
                    onChange={(e) => setAccionista(i, 'numero', e.target.value)}
                    placeholder="Numero"
                    data-no-upper
                    className={inputClase}
                  />
                  <button
                    type="button"
                    onClick={() => delAccionista(i)}
                    className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAccionista}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + Agregar accionista
              </button>
            </div>
          </Seccion>

          {/* 3. Informacion tributaria */}
          <Seccion numero={3} titulo="Informacion tributaria">
            <Campo label="Tipo de actividad">
              <Pills
                opciones={TIPOS_ACTIVIDAD}
                value={datos.tipoActividad}
                onChange={(v) => set('tipoActividad', v)}
              />
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Codigo CIIU">
                <input
                  value={datos.codigoCIIU}
                  onChange={(e) => set('codigoCIIU', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad principal (CIIU)">
                <input
                  value={datos.ciiuPrincipal}
                  onChange={(e) => set('ciiuPrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad secundaria (CIIU)">
                <input
                  value={datos.ciiuSecundaria}
                  onChange={(e) => set('ciiuSecundaria', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Descripcion detallada de la actividad">
              <textarea
                value={datos.descripcionActividad}
                onChange={(e) => set('descripcionActividad', e.target.value)}
                rows={2}
                className={inputClase}
              />
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Codigo ICA">
                <input
                  value={datos.codigoICA}
                  onChange={(e) => set('codigoICA', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad principal (ICA)">
                <input
                  value={datos.icaPrincipal}
                  onChange={(e) => set('icaPrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad secundaria (ICA)">
                <input
                  value={datos.icaSecundaria}
                  onChange={(e) => set('icaSecundaria', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Regimen al que pertenece">
              <Pills
                opciones={REGIMENES}
                value={datos.regimen}
                onChange={(v) => set('regimen', v)}
              />
            </Campo>
            <div className="space-y-3">
              <FilaTributaria
                label="Es gran contribuyente?"
                valor={datos.granContribuyente}
                onValor={(v) => set('granContribuyente', v)}
                resolucion={datos.granContribResolucion}
                onResolucion={(v) => set('granContribResolucion', v)}
                fecha={datos.granContribFecha}
                onFecha={(v) => set('granContribFecha', v)}
              />
              <FilaTributaria
                label="Es autorretenedor?"
                valor={datos.autorretenedor}
                onValor={(v) => set('autorretenedor', v)}
                resolucion={datos.autorretResolucion}
                onResolucion={(v) => set('autorretResolucion', v)}
                fecha={datos.autorretFecha}
                onFecha={(v) => set('autorretFecha', v)}
              />
              <FilaTributaria
                label="Esta exento de retencion en la fuente?"
                valor={datos.exentoRetencion}
                onValor={(v) => set('exentoRetencion', v)}
                resolucion={datos.exentoResolucion}
                onResolucion={(v) => set('exentoResolucion', v)}
                fecha={datos.exentoFecha}
                onFecha={(v) => set('exentoFecha', v)}
              />
              <FilaTributaria
                label="Es retenedor de ICA?"
                valor={datos.retenedorICA}
                onValor={(v) => set('retenedorICA', v)}
                resolucion={datos.retICAResolucion}
                onResolucion={(v) => set('retICAResolucion', v)}
                fecha={datos.retICAFecha}
                onFecha={(v) => set('retICAFecha', v)}
              />
            </div>
          </Seccion>

          {/* 4. Facturacion electronica */}
          <Seccion numero={4} titulo="Informacion para facturacion electronica">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="E-mail para factura electronica">
                <input
                  type="email"
                  value={datos.emailFE}
                  onChange={(e) => set('emailFE', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Responsable de facturacion">
                <input
                  value={datos.responsableFE}
                  onChange={(e) => set('responsableFE', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono de contacto">
                <input
                  value={datos.telefonoFE}
                  onChange={(e) => set('telefonoFE', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 5. Datos de contacto comercial / pagos */}
          <Seccion numero={5} titulo="Datos de contacto comercial">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Persona encargada de compras/pagos">
                <input
                  value={datos.pagosNombre}
                  onChange={(e) => set('pagosNombre', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Cargo">
                <input
                  value={datos.pagosCargo}
                  onChange={(e) => set('pagosCargo', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Celular">
                <input
                  value={datos.pagosCelular}
                  onChange={(e) => set('pagosCelular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono / Ext.">
                <input
                  value={datos.pagosTelefono}
                  onChange={(e) => set('pagosTelefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 6. Referencias */}
          <Seccion numero={6} titulo="Referencias">
            <ListaReferencias
              titulo="Comerciales"
              refs={datos.referenciasComerciales}
              onSet={(i, c, v) => setRef('referenciasComerciales', i, c, v)}
              onAdd={() => addRef('referenciasComerciales')}
              onDel={(i) => delRef('referenciasComerciales', i)}
            />
            <ListaReferencias
              titulo="Personales"
              refs={datos.referenciasPersonales}
              onSet={(i, c, v) => setRef('referenciasPersonales', i, c, v)}
              onAdd={() => addRef('referenciasPersonales')}
              onDel={(i) => delRef('referenciasPersonales', i)}
            />
          </Seccion>

          {/* 7. Informacion financiera */}
          <Seccion numero={7} titulo="Informacion financiera">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Activos $">
                <input
                  type="number"
                  min="0"
                  value={datos.activos}
                  onChange={(e) => set('activos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Ingresos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.ingresosMensuales}
                  onChange={(e) => set('ingresosMensuales', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Concepto de ingresos mensuales">
                <input
                  value={datos.conceptoIngresos}
                  onChange={(e) => set('conceptoIngresos', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Pasivos $">
                <input
                  type="number"
                  min="0"
                  value={datos.pasivos}
                  onChange={(e) => set('pasivos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Costos y gastos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.costosGastos}
                  onChange={(e) => set('costosGastos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Patrimonio $">
                <input
                  type="number"
                  min="0"
                  value={datos.patrimonio}
                  onChange={(e) => set('patrimonio', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Otros ingresos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.otrosIngresos}
                  onChange={(e) => set('otrosIngresos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo
                label="Concepto de otros ingresos"
                className="md:col-span-2"
              >
                <input
                  value={datos.conceptoOtrosIngresos}
                  onChange={(e) =>
                    set('conceptoOtrosIngresos', e.target.value)
                  }
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 8. Autorizaciones */}
          <Seccion numero={8} titulo="Autorizaciones y declaraciones">
            <p className="mb-3 text-xs text-slate-500">
              Debes abrir y aceptar cada una de las siguientes autorizaciones y
              declaraciones para poder guardar la solicitud.
            </p>
            <div className="space-y-3">
              <FilaAutorizacion
                aceptado={datos.autorizaDatos}
                onClick={() => setModalDatos(true)}
                texto="1. Autorizacion para el tratamiento de datos personales (Ley 1581 de 2012)."
              />
              <FilaAutorizacion
                aceptado={datos.autorizaCentrales}
                onClick={() => setModalCentrales(true)}
                texto="2. Autorizacion para consultar, reportar y compartir informacion en centrales de riesgo (Ley 1266 de 2008)."
              />
              <FilaAutorizacion
                aceptado={datos.declaraVeracidad}
                onClick={() => setModalFondos(true)}
                texto="3. Declaracion de origen de fondos, recursos y actividad economica (SAGRILAFT)."
              />
              <FilaAutorizacion
                aceptado={datos.autorizaListas}
                onClick={() => setModalListas(true)}
                texto="4. Autorizacion para consultas en listas vinculantes, restrictivas, sancionatorias, PEP, antecedentes y fuentes de debida diligencia."
              />
              <FilaAutorizacion
                aceptado={datos.aceptaIntegral}
                onClick={() => setModalIntegral(true)}
                texto="5. Aceptacion integral de las autorizaciones y declaraciones del formulario."
              />
              <FilaAutorizacion
                aceptado={datos.aceptaTrazabilidad}
                onClick={() => setModalTrazabilidad(true)}
                texto="6. Aceptacion electronica mediante link de acceso, autorizacion y trazabilidad."
              />
            </div>
          </Seccion>

          {/* 9. Beneficiario final */}
          <Seccion numero={9} titulo="Beneficiario final">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Nombre completo" className="md:col-span-2">
                <input
                  value={datos.bfNombre}
                  onChange={(e) => set('bfNombre', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Tipo de documento">
                <select
                  value={datos.bfTipoDocumento}
                  onChange={(e) => set('bfTipoDocumento', e.target.value)}
                  className={inputClase}
                >
                  {TIPOS_DOC.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Numero">
                <input
                  value={datos.bfNumero}
                  onChange={(e) => set('bfNumero', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Fecha de nacimiento">
                <input
                  type="date"
                  value={datos.bfFechaNacimiento}
                  onChange={(e) => set('bfFechaNacimiento', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Nacionalidad">
                <input
                  value={datos.bfNacionalidad}
                  onChange={(e) => set('bfNacionalidad', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Pais de residencia">
                <input
                  value={datos.bfPaisResidencia}
                  onChange={(e) => set('bfPaisResidencia', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Celular">
                <input
                  value={datos.bfCelular}
                  onChange={(e) => set('bfCelular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Direccion">
              <input
                value={datos.bfDireccion}
                onChange={(e) => set('bfDireccion', e.target.value)}
                className={inputClase}
              />
            </Campo>
          </Seccion>

          {/* 10. Documentos requeridos (segun tipo de credito) */}
          {docsRequeridos(datos.tipoCredito).length > 0 && (
            <Seccion numero={10} titulo="Documentos requeridos">
              <p className="text-xs text-slate-500">
                Adjunta cada documento en formato JPG o PDF.
              </p>
              <div className="space-y-3">
                {docsRequeridos(datos.tipoCredito).map((doc) => {
                  const cargado = datos.documentos[doc.id]
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {doc.label}
                          {!doc.opcional && (
                            <span className="text-red-500"> *</span>
                          )}
                        </p>
                        {cargado ? (
                          <a
                            href={cargado.contenido}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-xs text-green-600 underline"
                            data-no-upper
                          >
                            {cargado.nombre}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">Sin archivo</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100">
                          {cargado ? 'Cambiar' : 'Subir'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,application/pdf"
                            className="hidden"
                            onChange={(e) =>
                              cargarDocumento(
                                doc.id,
                                e.target.files?.[0] ?? null,
                              )
                            }
                          />
                        </label>
                        {cargado && (
                          <button
                            type="button"
                            onClick={() => quitarDocumento(doc.id)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Seccion>
          )}

          {/* Estado (uso interno) + acciones */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <Campo label="Estado de la vinculacion">
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={inputClase}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="ml-auto flex items-center gap-3">
                {errorForm && (
                  <span className="text-sm text-red-600">{errorForm}</span>
                )}
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
                  className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? 'Guardando...'
                    : editandoId
                      ? 'Guardar cambios'
                      : 'Realizar solicitud'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {modalDatos && (
        <ModalAutorizacion
          titulo="Autorización para el tratamiento de datos personales"
          subtitulo="Conforme a la Ley 1581 de 2012 y normas que la reglamenten, modifiquen o sustituyan"
          aceptado={datos.autorizaDatos}
          onAceptar={() => {
            set('autorizaDatos', true)
            setModalDatos(false)
          }}
          onNoAceptar={() => {
            set('autorizaDatos', false)
            setModalDatos(false)
          }}
          onCerrar={() => setModalDatos(false)}
        >
          <CuerpoDatos empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalCentrales && (
        <ModalAutorizacion
          titulo="Autorización para consultar, reportar, procesar y compartir información en centrales de riesgo"
          subtitulo="Conforme a la Ley 1266 de 2008, Ley 2157 de 2021 y normas complementarias"
          aceptado={datos.autorizaCentrales}
          onAceptar={() => {
            set('autorizaCentrales', true)
            setModalCentrales(false)
          }}
          onNoAceptar={() => {
            set('autorizaCentrales', false)
            setModalCentrales(false)
          }}
          onCerrar={() => setModalCentrales(false)}
        >
          <CuerpoCentrales empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalFondos && (
        <ModalAutorizacion
          titulo="Declaración de origen de fondos, recursos y actividad económica"
          aceptado={datos.declaraVeracidad}
          onAceptar={() => {
            set('declaraVeracidad', true)
            setModalFondos(false)
          }}
          onNoAceptar={() => {
            set('declaraVeracidad', false)
            setModalFondos(false)
          }}
          onCerrar={() => setModalFondos(false)}
        >
          <CuerpoFondos empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalListas && (
        <ModalAutorizacion
          titulo="Autorización para consultas en listas vinculantes, restrictivas, sancionatorias, PEP, antecedentes y fuentes de debida diligencia"
          aceptado={datos.autorizaListas}
          onAceptar={() => {
            set('autorizaListas', true)
            setModalListas(false)
          }}
          onNoAceptar={() => {
            set('autorizaListas', false)
            setModalListas(false)
          }}
          onCerrar={() => setModalListas(false)}
        >
          <CuerpoListas empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalIntegral && (
        <ModalAutorizacion
          titulo="Cláusula final para aceptación integral"
          aceptado={datos.aceptaIntegral}
          onAceptar={() => {
            set('aceptaIntegral', true)
            setModalIntegral(false)
          }}
          onNoAceptar={() => {
            set('aceptaIntegral', false)
            setModalIntegral(false)
          }}
          onCerrar={() => setModalIntegral(false)}
        >
          <CuerpoIntegral empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalTrazabilidad && (
        <ModalAutorizacion
          titulo="Aceptación electrónica mediante link de acceso, autorización y trazabilidad"
          aceptado={datos.aceptaTrazabilidad}
          onAceptar={() => {
            set('aceptaTrazabilidad', true)
            setModalTrazabilidad(false)
          }}
          onNoAceptar={() => {
            set('aceptaTrazabilidad', false)
            setModalTrazabilidad(false)
          }}
          onCerrar={() => setModalTrazabilidad(false)}
        >
          <CuerpoTrazabilidad empresa={nombreLegal(datos.empresa)} />
        </ModalAutorizacion>
      )}

      {modalFoto && (
        <CapturaFoto
          onCapturar={(url) => set('repFoto', url)}
          onCerrar={() => setModalFoto(false)}
        />
      )}
      {modalFirma && (
        <FirmaModal
          onGuardar={(url) => set('repFirma', url)}
          onCerrar={() => setModalFirma(false)}
        />
      )}

      {!mostrarForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, documento o consecutivo..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-medium">Consecutivo</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Tipo persona</th>
                  <th className="px-4 py-3 font-medium">Telefono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-brand-700">
                      {r.consecutivo ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtFecha(r.fecha)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.cliente}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.documento ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.tipoPersona ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.telefono ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${colorEstado(
                          r.estado,
                        )}`}
                      >
                        {r.estado ?? 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => abrirEdicion(r)}
                          className="text-brand-600 hover:underline"
                        >
                          Ver / Editar
                        </button>
                        <button
                          onClick={() => {
                            setErrorEliminar(null)
                            setAEliminar(r)
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      {cargando
                        ? 'Cargando vinculaciones...'
                        : error
                          ? `Error: ${error}`
                          : busqueda || filtroEstado
                            ? 'Sin resultados para la busqueda.'
                            : 'Sin vinculaciones registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar vinculacion"
          descripcion={`Vas a eliminar la vinculacion de "${aEliminar.cliente}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

// --------------------------- Subcomponentes ---------------------------

function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {numero}
        </span>
        <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </section>
  )
}

function Campo({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function Pills({
  opciones,
  value,
  onChange,
  colores,
}: {
  opciones: string[]
  value: string
  onChange: (v: string) => void
  colores?: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => {
        const activo = value === op
        const activoClase =
          (colores && colores[op]) || 'border-brand-600 bg-brand-600 text-white'
        return (
          <button
            key={op}
            type="button"
            onClick={() => onChange(activo ? '' : op)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activo
                ? activoClase
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600'
            }`}
          >
            {op}
          </button>
        )
      })}
    </div>
  )
}

function FilaTributaria({
  label,
  valor,
  onValor,
  resolucion,
  onResolucion,
  fecha,
  onFecha,
}: {
  label: string
  valor: string
  onValor: (v: string) => void
  resolucion: string
  onResolucion: (v: string) => void
  fecha: string
  onFecha: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto_1fr_1fr]">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex gap-2">
        {SI_NO.map((op) => {
          const activo = valor === op
          return (
            <button
              key={op}
              type="button"
              onClick={() => onValor(activo ? '' : op)}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                activo
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400'
              }`}
            >
              {op}
            </button>
          )
        })}
      </div>
      <input
        value={resolucion}
        onChange={(e) => onResolucion(e.target.value)}
        placeholder="Resolucion No."
        data-no-upper
        className={inputClase}
      />
      <input
        type="date"
        value={fecha}
        onChange={(e) => onFecha(e.target.value)}
        className={inputClase}
      />
    </div>
  )
}

function ListaReferencias({
  titulo,
  refs,
  onSet,
  onAdd,
  onDel,
}: {
  titulo: string
  refs: Referencia[]
  onSet: (i: number, campo: keyof Referencia, valor: string) => void
  onAdd: () => void
  onDel: (i: number) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      {refs.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <input
            value={r.nombre}
            onChange={(e) => onSet(i, 'nombre', e.target.value)}
            placeholder="Nombre"
            className={inputClase}
          />
          <input
            value={r.direccion}
            onChange={(e) => onSet(i, 'direccion', e.target.value)}
            placeholder="Direccion"
            className={inputClase}
          />
          <input
            value={r.ciudad}
            onChange={(e) => onSet(i, 'ciudad', e.target.value)}
            placeholder="Ciudad"
            className={inputClase}
          />
          <input
            value={r.telefono}
            onChange={(e) => onSet(i, 'telefono', e.target.value)}
            placeholder="Telefono"
            data-no-upper
            className={inputClase}
          />
          <button
            type="button"
            onClick={() => onDel(i)}
            className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        + Agregar referencia {titulo.toLowerCase()}
      </button>
    </div>
  )
}

function FilaAutorizacion({
  aceptado,
  texto,
  onClick,
}: {
  aceptado: boolean
  texto: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
    >
      <span
        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded border ${
          aceptado
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300'
        }`}
      >
        {aceptado && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="M2 6l3 3 5-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-sm text-slate-600">
        {texto}
        {aceptado ? (
          <span className="ml-1 font-semibold text-green-600">(Aceptada)</span>
        ) : (
          <span className="ml-1 font-semibold text-red-500">
            (Requiere aceptacion *)
          </span>
        )}
      </span>
    </button>
  )
}

function ModalAutorizacion({
  titulo,
  subtitulo,
  aceptado,
  onAceptar,
  onNoAceptar,
  onCerrar,
  children,
}: {
  titulo: string
  subtitulo?: string
  aceptado: boolean
  onAceptar: () => void
  onNoAceptar: () => void
  onCerrar: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
            {subtitulo && (
              <p className="text-xs font-semibold text-slate-500">
                {subtitulo}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="flex-none rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-6 py-4 text-sm text-slate-700">
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onNoAceptar}
            className={`rounded-md border px-5 py-2 text-sm font-semibold ${
              !aceptado
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-300 text-slate-600 hover:bg-white'
            }`}
          >
            No acepto
          </button>
          <button
            type="button"
            onClick={onAceptar}
            className="rounded-md bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Acepto
          </button>
        </div>
      </div>
    </div>
  )
}

function CuerpoDatos({ empresa }: { empresa: string }) {
  return (
    <>
      <p>
        Autorizo de manera libre, previa, expresa e informada a {empresa}, en
        calidad de responsable del tratamiento, para recolectar,
        almacenar, consultar, usar, actualizar, circular, transmitir,
        transferir, verificar, procesar, conservar y suprimir, cuando sea
        procedente, mis datos personales y/o la información suministrada en
        calidad de contraparte, representante legal, socio, accionista,
        beneficiario final, administrador, contacto comercial, financiero,
        contable o persona vinculada a la relación comercial, contractual o
        jurídica.
      </p>
      <p>
        Esta autorización comprende el tratamiento de información personal,
        comercial, financiera, tributaria, societaria, contractual, contable, de
        contacto y aquella necesaria para adelantar procesos de vinculación,
        actualización, debida diligencia, conocimiento de contrapartes,
        evaluación de riesgos, gestión comercial, crediticia, administrativa,
        contable, jurídica y de cumplimiento.
      </p>
      <p className="font-semibold text-slate-900">
        Los datos podrán ser tratados para las siguientes finalidades:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        {FINALIDADES_DATOS.map((f, i) => (
          <li key={i}>{f.replace(/\{\{EMPRESA\}\}/g, empresa)}</li>
        ))}
      </ol>
      <p>
        Declaro que he sido informado de mis derechos como titular de la
        información, entre ellos conocer, actualizar, rectificar y solicitar
        prueba de la autorización; ser informado sobre el uso dado a mis datos;
        presentar quejas ante la Superintendencia de Industria y Comercio;
        revocar la autorización y/o solicitar la supresión de datos cuando sea
        procedente conforme a la ley.
      </p>
    </>
  )
}

function CuerpoCentrales({ empresa }: { empresa: string }) {
  return (
    <>
      <p>
        Autorizo de manera previa, expresa, libre e informada a {empresa} para
        consultar, solicitar, obtener, verificar, reportar,
        actualizar, procesar, conservar, compartir y circular mi información
        financiera, crediticia, comercial, de servicios y la proveniente de
        terceros países ante centrales de riesgo, operadores de información,
        fuentes de información, bases de datos comerciales, proveedores de
        referencias, entidades financieras, aliados estratégicos y demás
        terceros autorizados por la ley.
      </p>
      <p>
        Esta autorización aplica para información relacionada con obligaciones
        comerciales, cupos de crédito, facturas, acuerdos de pago, comportamiento
        de pago, referencias comerciales, referencias bancarias, obligaciones
        pendientes, cumplimiento o incumplimiento de compromisos comerciales,
        estados de cartera, mora, pagos, extinción de obligaciones y demás
        información necesaria para evaluar y administrar el riesgo crediticio y
        comercial.
      </p>
      <p className="font-semibold text-slate-900">
        La autorización se otorga para las siguientes finalidades:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        {FINALIDADES_CENTRALES.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ol>
      <p>
        La información podrá ser consultada, reportada o compartida ante
        centrales de riesgo, operadores de información financiera, crediticia,
        comercial o de servicios, tales como Datacrédito Experian, TransUnion,
        Procrédito, Fenalco o cualquier otra entidad legalmente autorizada para
        operar este tipo de bases de datos.
      </p>
      <p>
        Declaro conocer que la información reportada deberá ser veraz, completa,
        exacta, actualizada, comprobable y comprensible. También reconozco que
        podré ejercer mis derechos de habeas data financiero conforme a la Ley
        1266 de 2008 y demás normas aplicables.
      </p>
    </>
  )
}

function CuerpoFondos({ empresa }: { empresa: string }) {
  return (
    <>
      <p>
        Declaro bajo la gravedad de juramento que los recursos, ingresos, fondos
        y bienes vinculados a la relación comercial con {empresa}
        provienen de actividades lícitas, reales y verificables, y que no
        proceden, directa ni indirectamente, de actividades relacionadas con el
        lavado de activos, la financiación del terrorismo, la financiación de la
        proliferación de armas de destrucción masiva ni de ningún otro delito
        fuente.
      </p>
      <p>
        Manifiesto que la información suministrada es cierta, completa y
        actualizada, y que asumo la responsabilidad legal derivada de cualquier
        declaración falsa, inexacta o incompleta.
      </p>
      <p className="font-semibold text-slate-900">Así mismo, declaro que:</p>
      <ol className="list-decimal space-y-1 pl-5">
        {DECLARACIONES_FONDOS.map((f, i) => (
          <li key={i}>{f.replace(/\{\{EMPRESA\}\}/g, empresa)}</li>
        ))}
      </ol>
      <p>
        <span className="font-semibold text-slate-900">
          Referencia interna:{' '}
        </span>
        La Política Integral LA/FT/FPADM de {empresa} establece
        que la debida diligencia y la debida diligencia intensificada son
        instrumentos principales para prevenir y controlar riesgos LA/FT/FPADM,
        incluyendo el conocimiento de la contraparte, su negocio, operaciones,
        productos, volumen de transacciones y origen de los activos.
      </p>
    </>
  )
}

function CuerpoListas({ empresa }: { empresa: string }) {
  return (
    <>
      <p>
        Autorizo de manera previa, expresa, libre e informada a {empresa}
        para consultar, verificar, cotejar, procesar y conservar
        información en listas vinculantes, restrictivas, sancionatorias, de
        personas expuestas políticamente (PEP), de antecedentes y en fuentes de
        debida diligencia, nacionales e internacionales, con el fin de prevenir
        y controlar riesgos de lavado de activos, financiación del terrorismo,
        financiación de la proliferación de armas de destrucción masiva,
        corrupción, soborno y demás riesgos asociados.
      </p>
      <p className="font-semibold text-slate-900">
        Esta autorización comprende la consulta y verificación de información de:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        {LISTAS_VERIFICACION.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ol>
      <p className="font-semibold text-slate-900">
        Las consultas podrán realizarse, entre otras, en las siguientes fuentes:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        {LISTAS_FUENTES.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ol>
      <p>
        Autorizo que estas consultas se realicen antes de la vinculación,
        durante toda la relación comercial y con posterioridad a su terminación,
        cuando ello sea necesario para el cumplimiento de obligaciones legales o
        de gestión de riesgos.
      </p>
      <p>
        Declaro que la información suministrada sobre socios, accionistas,
        beneficiarios finales, representantes y terceros relacionados es cierta y
        que cuento con las autorizaciones necesarias para entregarla y permitir
        su verificación.
      </p>
      <p>
        Entiendo y acepto que la aparición en listas restrictivas, sancionatorias
        o vinculantes, así como la existencia de inconsistencias relevantes,
        podrá dar lugar al rechazo de la vinculación, suspensión o terminación de
        la relación comercial y demás medidas que la compañía considere
        procedentes.
      </p>
      <p>
        <span className="font-semibold text-slate-900">
          Referencia interna:{' '}
        </span>
        La política interna de {empresa} contempla el conocimiento
        del beneficiario final como un elemento crucial para identificar quién
        controla o se beneficia realmente de una cuenta o transacción, más allá
        de los titulares nominales.
      </p>
    </>
  )
}

function CuerpoIntegral({ empresa }: { empresa: string }) {
  return (
    <>
      <p>
        Declaro que he leído, entendido y aprobado de manera integral la
        totalidad de las autorizaciones, declaraciones y cláusulas contenidas en
        este formulario, las cuales acepto de forma libre, voluntaria, expresa e
        informada. Al seleccionar "Acepto" manifiesto mi consentimiento pleno y
        me obligo a su cumplimiento durante toda la relación comercial con {empresa}.
      </p>
      <p>
        Entiendo que la entrega de información falsa, inexacta, incompleta o
        desactualizada, así como el incumplimiento de las obligaciones aquí
        declaradas, podrá dar lugar al rechazo de la vinculación, suspensión o
        terminación de la relación comercial, bloqueo de cupo y demás acciones
        legales, contractuales y de cumplimiento a que haya lugar.
      </p>
    </>
  )
}

function CuerpoTrazabilidad({ empresa }: { empresa: string }) {
  const EMP = empresa.toUpperCase()
  return (
    <>
      <p>
        La contraparte declara que, al ingresar al link de acceso suministrado
        por {EMP}, revisar el contenido del formulario
        electrónico y seleccionar la opción "Acepto", marcar la casilla de
        aprobación, hacer clic en el botón de confirmación o realizar cualquier
        acción equivalente de aceptación dentro del enlace habilitado, manifiesta
        de manera libre, previa, expresa, informada e inequívoca su voluntad de
        aceptar las autorizaciones, declaraciones, políticas y condiciones
        contenidas en el formulario electrónico de vinculación, actualización y
        debida diligencia.
      </p>
      <p>
        La aceptación realizada a través del link de acceso constituirá una
        manifestación válida de voluntad de la contraparte y servirá como
        evidencia de que el titular, representante legal, autorizado o persona
        que actúa en nombre de la contraparte conoció, revisó y aceptó el
        contenido puesto a su disposición, incluyendo, cuando aplique, la
        autorización para el tratamiento de datos personales, consulta y reporte
        en centrales de riesgo, declaración de origen lícito de fondos,
        autorización para búsquedas en listas vinculantes, restrictivas,
        sancionatorias, PEP, antecedentes y demás fuentes de debida diligencia.
      </p>
      <p>
        Para efectos de control, trazabilidad, auditoría y conservación
        probatoria, {EMP} podrá registrar y conservar evidencia
        electrónica del evento de aceptación realizado mediante el link de
        acceso, incluyendo como mínimo: fecha y hora de ingreso, fecha y hora de
        aceptación, identificación o datos registrados de la contraparte, nombre
        o razón social, tipo y número de documento, correo electrónico o número
        celular al cual fue enviado el enlace, dirección IP, dispositivo,
        navegador utilizado, versión del texto aceptado, resultado de la
        aceptación o rechazo, código único del formulario, registro de auditoría
        del evento y demás elementos técnicos disponibles que permitan verificar
        la autenticidad, integridad, disponibilidad y conservación de la
        autorización.
      </p>
      <p>
        La contraparte reconoce que el link de acceso podrá ser enviado al correo
        electrónico, número celular, WhatsApp corporativo, mensaje de texto u
        otro canal informado por la contraparte o registrado en el proceso de
        vinculación o actualización. En consecuencia, será responsabilidad de la
        contraparte suministrar información de contacto cierta, completa,
        actualizada y bajo su control.
      </p>
      <p>
        La contraparte acepta que la trazabilidad electrónica generada por el uso
        del link de acceso podrá ser utilizada por {EMP} como
        soporte documental y probatorio ante auditorías internas, procesos de
        debida diligencia, gestión de crédito, cartera y recaudo, requerimientos
        de autoridades administrativas, judiciales, tributarias, de inspección,
        vigilancia y control, así como frente a eventuales controversias
        relacionadas con la autorización otorgada.
      </p>
      <p>
        La aceptación electrónica tendrá efectos respecto del texto vigente al
        momento de la aprobación. En caso de actualización, modificación o
        sustitución de las autorizaciones, políticas, declaraciones o condiciones
        del formulario, {EMP} podrá remitir un nuevo link de
        acceso para obtener una nueva aceptación electrónica, dejando registro de
        la versión correspondiente.
      </p>
      <p>
        En caso de seleccionar la opción "No acepto", no otorgar la autorización
        requerida, cerrar el link sin finalizar el proceso o no completar la
        aceptación electrónica, {EMP} podrá abstenerse de
        continuar con la vinculación, actualización, estudio de crédito, consulta
        en centrales de riesgo, consulta en listas, aprobación comercial,
        asignación de cupo o cualquier actuación que requiera autorización
        previa, expresa e informada, de conformidad con sus políticas internas y
        la normatividad aplicable.
      </p>
      <p className="font-semibold text-slate-900">
        Texto de referencia para la aceptación:
      </p>
      <p>
        <span className="font-semibold text-slate-900">Acepto: </span>
        Declaro que he leído, entendido y aceptado de manera libre, previa,
        expresa e informada el contenido del formulario electrónico enviado
        mediante link de acceso, y autorizo a {EMP} para
        conservar la trazabilidad electrónica de mi aceptación.
      </p>
      <p>
        <span className="font-semibold text-slate-900">No acepto: </span>
        Declaro que no otorgo la autorización solicitada y entiendo que {EMP}
        podrá abstenerse de continuar con el proceso cuando
        dicha autorización sea necesaria para la vinculación, actualización,
        estudio de crédito, consulta en listas, centrales de riesgo o debida
        diligencia.
      </p>
    </>
  )
}

function Kpi({ titulo, valor }: { titulo: string; valor: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{valor}</p>
    </div>
  )
}
