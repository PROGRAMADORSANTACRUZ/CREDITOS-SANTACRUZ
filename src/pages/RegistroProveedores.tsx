import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoRegistroProveedor } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { RegistroProveedor } from '../types/trazabilidad'

// --------------------------------------------------------------------------
// Modelo del formato F-DC-001 (Registro unico de proveedores y contratistas,
// multi-seccion). Todo el detalle se guarda en el campo `datos` (JSONB);
// los campos resumen (proveedor, nit, etc.) se derivan para el listado.
// --------------------------------------------------------------------------

interface Accionista {
  nombre: string
  tipoDocumento: string
  numero: string
}
interface Vehiculo {
  placa: string
  conductor: string
  cedula: string
  arl: string
}
interface RefComercial {
  nit: string
  nombre: string
  telefono: string
  correo: string
}
interface RefBancaria {
  entidad: string
  sucursal: string
  numeroCuenta: string
  telefono: string
  titular: string
  tipoCuenta: string
}
interface Contacto {
  nombre: string
  cargo: string
  telefono: string
  email: string
}

interface FormDatos {
  tipoRegistro: string
  tipoProveedor: string
  tipoIdentificacion: string
  fecha: string
  // 1. Informacion de la empresa
  razonSocial: string
  nit: string
  nombreRepLegal: string
  tipoIdRepLegal: string
  numeroIdRepLegal: string
  direccion: string
  ciudad: string
  telefono1: string
  telefono2: string
  celular: string
  correo: string
  paginaWeb: string
  origen: string
  tipoEmpresa: string
  // 2. Accionistas
  accionistas: Accionista[]
  // 3. Informacion de contacto
  contactoComercial: Contacto
  contactoContable: Contacto
  contactoLogistica: Contacto
  // 4. Informacion de movilidad
  poseeVehiculos: string
  vehiculosTipo: string
  vehiculos: Vehiculo[]
  // 5. Informacion contable y tributaria
  actividadPrincipal: string
  actividadSecundaria: string
  codigoCIIU: string
  retencionICA: string
  retencionFuente: string
  codigoActividadICA: string
  responsableIVA: string
  otroRegimen: string
  granContribuyente: boolean
  autorretenedor: boolean
  declaraRenta: string
  // 6. Informacion financiera
  activos: string
  ingresosMensuales: string
  conceptoIngresos: string
  pasivos: string
  costosGastos: string
  patrimonio: string
  otrosIngresos: string
  conceptoOtrosIngresos: string
  // 7. Certificaciones vigentes
  certificadoCalidad: string
  alcanceSGC: string
  sagrilaft: string
  certificadosVigentes: string
  // 8. Referencias comerciales
  referenciasComerciales: RefComercial[]
  // 9. Referencias bancarias
  referenciasBancarias: RefBancaria[]
  // 10. Origen de fondos
  fuenteSalario: boolean
  fuenteHonorarios: boolean
  fuenteVentaActivos: boolean
  fuenteOtro: boolean
  fuenteOtroCual: string
  // 11. Beneficiario final
  bfNombre: string
  bfTipoDocumento: string
  bfNumero: string
  bfFechaNacimiento: string
  bfNacionalidad: string
  bfPais: string
  bfDireccion: string
  bfTelefono: string
  // Autorizaciones
  autorizaDatos: boolean
  declaraVeracidad: boolean
}

const TIPOS_REGISTRO = ['Inscripcion', 'Actualizacion']
const TIPOS_PROVEEDOR = ['Insumos/Servicios', 'Animales en pie']
const TIPOS_DOC = ['CC', 'CE', 'NIT', 'TI']
const ORIGENES = ['Nacional', 'Extranjera']
const TIPOS_EMPRESA = ['Privada', 'Publica']
const REGIMENES_IVA = ['Responsable de IVA', 'No Responsable de IVA']
const SI_NO = ['Si', 'No']
const TIPOS_CUENTA = ['Ahorros', 'Corriente']
const ESTADOS = ['Pendiente', 'Aprobado', 'Rechazado']

const contactoVacio = (): Contacto => ({
  nombre: '',
  cargo: '',
  telefono: '',
  email: '',
})
const refComercialVacia = (): RefComercial => ({
  nit: '',
  nombre: '',
  telefono: '',
  correo: '',
})
const refBancariaVacia = (): RefBancaria => ({
  entidad: '',
  sucursal: '',
  numeroCuenta: '',
  telefono: '',
  titular: '',
  tipoCuenta: 'Ahorros',
})
const vehiculoVacio = (): Vehiculo => ({
  placa: '',
  conductor: '',
  cedula: '',
  arl: '',
})

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const datosVacio = (): FormDatos => ({
  tipoRegistro: 'Inscripcion',
  tipoProveedor: 'Insumos/Servicios',
  tipoIdentificacion: 'NIT',
  fecha: hoy(),
  razonSocial: '',
  nit: '',
  nombreRepLegal: '',
  tipoIdRepLegal: 'CC',
  numeroIdRepLegal: '',
  direccion: '',
  ciudad: '',
  telefono1: '',
  telefono2: '',
  celular: '',
  correo: '',
  paginaWeb: '',
  origen: 'Nacional',
  tipoEmpresa: 'Privada',
  accionistas: [],
  contactoComercial: contactoVacio(),
  contactoContable: contactoVacio(),
  contactoLogistica: contactoVacio(),
  poseeVehiculos: '',
  vehiculosTipo: '',
  vehiculos: [],
  actividadPrincipal: '',
  actividadSecundaria: '',
  codigoCIIU: '',
  retencionICA: '',
  retencionFuente: '',
  codigoActividadICA: '',
  responsableIVA: '',
  otroRegimen: '',
  granContribuyente: false,
  autorretenedor: false,
  declaraRenta: '',
  activos: '',
  ingresosMensuales: '',
  conceptoIngresos: '',
  pasivos: '',
  costosGastos: '',
  patrimonio: '',
  otrosIngresos: '',
  conceptoOtrosIngresos: '',
  certificadoCalidad: '',
  alcanceSGC: '',
  sagrilaft: '',
  certificadosVigentes: '',
  referenciasComerciales: [refComercialVacia()],
  referenciasBancarias: [refBancariaVacia()],
  fuenteSalario: false,
  fuenteHonorarios: false,
  fuenteVentaActivos: false,
  fuenteOtro: false,
  fuenteOtroCual: '',
  bfNombre: '',
  bfTipoDocumento: 'CC',
  bfNumero: '',
  bfFechaNacimiento: '',
  bfNacionalidad: '',
  bfPais: '',
  bfDireccion: '',
  bfTelefono: '',
  autorizaDatos: false,
  declaraVeracidad: false,
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

export function RegistroProveedores() {
  const [registros, setRegistros] = useState<RegistroProveedor[]>([])
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

  const [aEliminar, setAEliminar] = useState<RegistroProveedor | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getRegistroProveedores())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar los registros',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => datos.razonSocial.trim() !== '', [datos])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (filtroEstado && (r.estado ?? '') !== filtroEstado) return false
      if (!t) return true
      return (
        r.proveedor.toLowerCase().includes(t) ||
        (r.nit ?? '').toLowerCase().includes(t) ||
        (r.telefono ?? '').toLowerCase().includes(t) ||
        (r.consecutivo ?? '').toLowerCase().includes(t)
      )
    })
  }, [registros, busqueda, filtroEstado])

  const kpis = useMemo(() => {
    let pendientes = 0
    let aprobados = 0
    let animales = 0
    registros.forEach((r) => {
      if (r.estado === 'Aprobado') aprobados += 1
      else if (r.estado !== 'Rechazado') pendientes += 1
      if ((r.tipoProveedor ?? '').toLowerCase().includes('animales'))
        animales += 1
    })
    return { total: registros.length, pendientes, aprobados, animales }
  }, [registros])

  function set<K extends keyof FormDatos>(campo: K, valor: FormDatos[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  function setContacto(
    grupo: 'contactoComercial' | 'contactoContable' | 'contactoLogistica',
    campo: keyof Contacto,
    valor: string,
  ) {
    setDatos((prev) => ({
      ...prev,
      [grupo]: { ...prev[grupo], [campo]: valor },
    }))
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

  function setVehiculo(i: number, campo: keyof Vehiculo, valor: string) {
    setDatos((prev) => {
      const arr = prev.vehiculos.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, vehiculos: arr }
    })
  }
  function addVehiculo() {
    setDatos((prev) => ({
      ...prev,
      vehiculos: [...prev.vehiculos, vehiculoVacio()],
    }))
  }
  function delVehiculo(i: number) {
    setDatos((prev) => ({
      ...prev,
      vehiculos: prev.vehiculos.filter((_, j) => j !== i),
    }))
  }

  function setRefC(i: number, campo: keyof RefComercial, valor: string) {
    setDatos((prev) => {
      const arr = prev.referenciasComerciales.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, referenciasComerciales: arr }
    })
  }
  function addRefC() {
    setDatos((prev) => ({
      ...prev,
      referenciasComerciales: [
        ...prev.referenciasComerciales,
        refComercialVacia(),
      ],
    }))
  }
  function delRefC(i: number) {
    setDatos((prev) => ({
      ...prev,
      referenciasComerciales: prev.referenciasComerciales.filter(
        (_, j) => j !== i,
      ),
    }))
  }

  function setRefB(i: number, campo: keyof RefBancaria, valor: string) {
    setDatos((prev) => {
      const arr = prev.referenciasBancarias.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, referenciasBancarias: arr }
    })
  }
  function addRefB() {
    setDatos((prev) => ({
      ...prev,
      referenciasBancarias: [...prev.referenciasBancarias, refBancariaVacia()],
    }))
  }
  function delRefB(i: number) {
    setDatos((prev) => ({
      ...prev,
      referenciasBancarias: prev.referenciasBancarias.filter(
        (_, j) => j !== i,
      ),
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setDatos(datosVacio())
    setEstado('Pendiente')
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abrirEdicion(r: RegistroProveedor) {
    setEditandoId(r.id)
    const base = datosVacio()
    const d = (r.datos ?? {}) as Partial<FormDatos>
    setDatos({
      ...base,
      ...d,
      contactoComercial: d.contactoComercial ?? base.contactoComercial,
      contactoContable: d.contactoContable ?? base.contactoContable,
      contactoLogistica: d.contactoLogistica ?? base.contactoLogistica,
      accionistas: d.accionistas ?? base.accionistas,
      vehiculos: d.vehiculos ?? base.vehiculos,
      referenciasComerciales:
        d.referenciasComerciales ?? base.referenciasComerciales,
      referenciasBancarias:
        d.referenciasBancarias ?? base.referenciasBancarias,
      fecha: r.fecha ?? base.fecha,
      tipoProveedor: r.tipoProveedor ?? d.tipoProveedor ?? base.tipoProveedor,
      razonSocial: r.proveedor ?? d.razonSocial ?? '',
      nit: r.nit ?? d.nit ?? '',
      correo: r.correo ?? d.correo ?? '',
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
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const payload: NuevoRegistroProveedor = {
        fecha: datos.fecha || undefined,
        proveedor: datos.razonSocial.trim(),
        nit: datos.nit.trim() || undefined,
        telefono:
          datos.telefono1.trim() || datos.celular.trim() || undefined,
        correo: datos.correo.trim() || undefined,
        tipoProveedor: datos.tipoProveedor || undefined,
        estado,
        observaciones: undefined,
        datos: datos as unknown as Record<string, unknown>,
      }
      if (editandoId) {
        const actualizado = await api.actualizarRegistroProveedor(
          editandoId,
          payload,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearRegistroProveedor(payload)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el registro',
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
      await api.eliminarRegistroProveedor(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Registro unico de proveedores y contratistas
          </h2>
          <p className="text-slate-500">
            Formato F-DC-001 &mdash; Agropecuaria Santacruz Limitada
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo registro
          </button>
        )}
      </header>

      {!mostrarForm && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi titulo="Registros" valor={kpis.total} />
          <Kpi titulo="Pendientes" valor={kpis.pendientes} />
          <Kpi titulo="Aprobados" valor={kpis.aprobados} />
          <Kpi titulo="Animales en pie" valor={kpis.animales} />
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
                  {editandoId ? 'Editar registro' : 'Nuevo registro'} de
                  proveedor
                </h3>
                <p className="text-xs text-slate-500">
                  F-DC-001 &middot; Version 6
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Campo label="Tipo de registro">
                  <Pills
                    opciones={TIPOS_REGISTRO}
                    value={datos.tipoRegistro}
                    onChange={(v) => set('tipoRegistro', v)}
                  />
                </Campo>
                <Campo label="Tipo de proveedor">
                  <Pills
                    opciones={TIPOS_PROVEEDOR}
                    value={datos.tipoProveedor}
                    onChange={(v) => set('tipoProveedor', v)}
                  />
                </Campo>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={datos.fecha}
                    onChange={(e) => set('fecha', e.target.value)}
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Tipo de identificacion">
                  <Pills
                    opciones={TIPOS_DOC}
                    value={datos.tipoIdentificacion}
                    onChange={(v) => set('tipoIdentificacion', v)}
                  />
                </Campo>
              </div>
            </div>
          </div>

          {/* 1. Informacion de la empresa */}
          <Seccion numero={1} titulo="Informacion de la empresa">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Razon social o nombre completo *">
                <input
                  value={datos.razonSocial}
                  onChange={(e) => set('razonSocial', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="NIT o CC">
                <input
                  value={datos.nit}
                  onChange={(e) => set('nit', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo
                label="Nombre representante legal"
                className="md:col-span-2"
              >
                <input
                  value={datos.nombreRepLegal}
                  onChange={(e) => set('nombreRepLegal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Tipo ID rep. legal">
                <select
                  value={datos.tipoIdRepLegal}
                  onChange={(e) => set('tipoIdRepLegal', e.target.value)}
                  className={inputClase}
                >
                  {TIPOS_DOC.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="N. ID rep. legal">
                <input
                  value={datos.numeroIdRepLegal}
                  onChange={(e) => set('numeroIdRepLegal', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Direccion" className="md:col-span-2">
                <input
                  value={datos.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Ciudad">
                <input
                  value={datos.ciudad}
                  onChange={(e) => set('ciudad', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Celular">
                <input
                  value={datos.celular}
                  onChange={(e) => set('celular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Telefono 1">
                <input
                  value={datos.telefono1}
                  onChange={(e) => set('telefono1', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono 2">
                <input
                  value={datos.telefono2}
                  onChange={(e) => set('telefono2', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Correo electronico">
                <input
                  type="email"
                  value={datos.correo}
                  onChange={(e) => set('correo', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Pagina web">
                <input
                  value={datos.paginaWeb}
                  onChange={(e) => set('paginaWeb', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Origen">
                <Pills
                  opciones={ORIGENES}
                  value={datos.origen}
                  onChange={(v) => set('origen', v)}
                />
              </Campo>
              <Campo label="Tipo">
                <Pills
                  opciones={TIPOS_EMPRESA}
                  value={datos.tipoEmpresa}
                  onChange={(v) => set('tipoEmpresa', v)}
                />
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

          {/* 3. Informacion de contacto */}
          <Seccion numero={3} titulo="Informacion de contacto">
            <BloqueContacto
              titulo="Contacto comercial"
              contacto={datos.contactoComercial}
              onSet={(c, v) => setContacto('contactoComercial', c, v)}
            />
            <BloqueContacto
              titulo="Contacto contable"
              contacto={datos.contactoContable}
              onSet={(c, v) => setContacto('contactoContable', c, v)}
            />
            <BloqueContacto
              titulo="Contacto logistica"
              contacto={datos.contactoLogistica}
              onSet={(c, v) => setContacto('contactoLogistica', c, v)}
            />
          </Seccion>

          {/* 4. Informacion de movilidad */}
          <Seccion numero={4} titulo="Informacion de movilidad">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Posee vehiculos para movilizacion de animales">
                <Pills
                  opciones={SI_NO}
                  value={datos.poseeVehiculos}
                  onChange={(v) => set('poseeVehiculos', v)}
                />
              </Campo>
              <Campo label="Los vehiculos son">
                <Pills
                  opciones={['Propios', 'Tercerizados']}
                  value={datos.vehiculosTipo}
                  onChange={(v) => set('vehiculosTipo', v)}
                />
              </Campo>
            </div>
            <div className="space-y-3">
              {datos.vehiculos.length === 0 && (
                <p className="text-sm text-slate-400">
                  Sin vehiculos registrados.
                </p>
              )}
              {datos.vehiculos.map((v, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1.5fr_1fr_1fr_auto]"
                >
                  <input
                    value={v.placa}
                    onChange={(e) => setVehiculo(i, 'placa', e.target.value)}
                    placeholder="N. de placa"
                    className={inputClase}
                  />
                  <input
                    value={v.conductor}
                    onChange={(e) =>
                      setVehiculo(i, 'conductor', e.target.value)
                    }
                    placeholder="Nombre conductor"
                    className={inputClase}
                  />
                  <input
                    value={v.cedula}
                    onChange={(e) => setVehiculo(i, 'cedula', e.target.value)}
                    placeholder="Cedula"
                    data-no-upper
                    className={inputClase}
                  />
                  <input
                    value={v.arl}
                    onChange={(e) => setVehiculo(i, 'arl', e.target.value)}
                    placeholder="ARL"
                    className={inputClase}
                  />
                  <button
                    type="button"
                    onClick={() => delVehiculo(i)}
                    className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addVehiculo}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + Agregar vehiculo
              </button>
            </div>
          </Seccion>

          {/* 5. Informacion contable y tributaria */}
          <Seccion numero={5} titulo="Informacion contable y tributaria">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Actividad economica principal">
                <input
                  value={datos.actividadPrincipal}
                  onChange={(e) => set('actividadPrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad economica secundaria">
                <input
                  value={datos.actividadSecundaria}
                  onChange={(e) => set('actividadSecundaria', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Codigo CIIU">
                <input
                  value={datos.codigoCIIU}
                  onChange={(e) => set('codigoCIIU', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Codigo actividad ICA">
                <input
                  value={datos.codigoActividadICA}
                  onChange={(e) => set('codigoActividadICA', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="% Retencion ICA">
                <input
                  value={datos.retencionICA}
                  onChange={(e) => set('retencionICA', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="% Retencion en la fuente">
                <input
                  value={datos.retencionFuente}
                  onChange={(e) => set('retencionFuente', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Regimen">
                <Pills
                  opciones={REGIMENES_IVA}
                  value={datos.responsableIVA}
                  onChange={(v) => set('responsableIVA', v)}
                />
              </Campo>
              <Campo label="Otro (cual?)">
                <input
                  value={datos.otroRegimen}
                  onChange={(e) => set('otroRegimen', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Check
                checked={datos.granContribuyente}
                onChange={(v) => set('granContribuyente', v)}
                texto="Gran contribuyente"
              />
              <Check
                checked={datos.autorretenedor}
                onChange={(v) => set('autorretenedor', v)}
                texto="Autorretenedor"
              />
              <Campo label="Declara renta">
                <Pills
                  opciones={SI_NO}
                  value={datos.declaraRenta}
                  onChange={(v) => set('declaraRenta', v)}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 6. Informacion financiera */}
          <Seccion numero={6} titulo="Informacion financiera">
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

          {/* 7. Certificaciones vigentes */}
          <Seccion numero={7} titulo="Certificaciones vigentes">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Cuenta con certificado de calidad">
                <Pills
                  opciones={SI_NO}
                  value={datos.certificadoCalidad}
                  onChange={(v) => set('certificadoCalidad', v)}
                />
              </Campo>
              <Campo label="Cuenta con SAGRILAFT">
                <Pills
                  opciones={SI_NO}
                  value={datos.sagrilaft}
                  onChange={(v) => set('sagrilaft', v)}
                />
              </Campo>
            </div>
            <Campo label="Alcance S.G.C">
              <input
                value={datos.alcanceSGC}
                onChange={(e) => set('alcanceSGC', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Certificados de calidad vigentes">
              <textarea
                value={datos.certificadosVigentes}
                onChange={(e) => set('certificadosVigentes', e.target.value)}
                rows={2}
                className={inputClase}
              />
            </Campo>
          </Seccion>

          {/* 8. Referencias comerciales */}
          <Seccion numero={8} titulo="Referencias comerciales">
            <div className="space-y-3">
              {datos.referenciasComerciales.map((r, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1.5fr_1fr_1.5fr_auto]"
                >
                  <input
                    value={r.nit}
                    onChange={(e) => setRefC(i, 'nit', e.target.value)}
                    placeholder="NIT"
                    data-no-upper
                    className={inputClase}
                  />
                  <input
                    value={r.nombre}
                    onChange={(e) => setRefC(i, 'nombre', e.target.value)}
                    placeholder="Nombre de la empresa"
                    className={inputClase}
                  />
                  <input
                    value={r.telefono}
                    onChange={(e) => setRefC(i, 'telefono', e.target.value)}
                    placeholder="Telefono"
                    data-no-upper
                    className={inputClase}
                  />
                  <input
                    value={r.correo}
                    onChange={(e) => setRefC(i, 'correo', e.target.value)}
                    placeholder="Correo electronico"
                    data-no-upper
                    className={inputClase}
                  />
                  <button
                    type="button"
                    onClick={() => delRefC(i)}
                    className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRefC}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + Agregar referencia comercial
              </button>
            </div>
          </Seccion>

          {/* 9. Referencias bancarias */}
          <Seccion numero={9} titulo="Referencias bancarias">
            <div className="space-y-3">
              {datos.referenciasBancarias.map((r, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <input
                      value={r.entidad}
                      onChange={(e) => setRefB(i, 'entidad', e.target.value)}
                      placeholder="Entidad"
                      className={inputClase}
                    />
                    <input
                      value={r.sucursal}
                      onChange={(e) => setRefB(i, 'sucursal', e.target.value)}
                      placeholder="Sucursal"
                      className={inputClase}
                    />
                    <input
                      value={r.numeroCuenta}
                      onChange={(e) =>
                        setRefB(i, 'numeroCuenta', e.target.value)
                      }
                      placeholder="N. de cuenta"
                      data-no-upper
                      className={inputClase}
                    />
                    <input
                      value={r.telefono}
                      onChange={(e) => setRefB(i, 'telefono', e.target.value)}
                      placeholder="Telefono"
                      data-no-upper
                      className={inputClase}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_auto]">
                    <input
                      value={r.titular}
                      onChange={(e) => setRefB(i, 'titular', e.target.value)}
                      placeholder="Titular de la cuenta"
                      className={inputClase}
                    />
                    <select
                      value={r.tipoCuenta}
                      onChange={(e) =>
                        setRefB(i, 'tipoCuenta', e.target.value)
                      }
                      className={inputClase}
                    >
                      {TIPOS_CUENTA.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => delRefB(i)}
                      className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addRefB}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + Agregar referencia bancaria
              </button>
            </div>
          </Seccion>

          {/* 10. Declaracion origen de fondos */}
          <Seccion
            numero={10}
            titulo="Declaracion de origen de fondos"
          >
            <p className="text-sm text-slate-500">
              Los recursos provienen de las siguientes fuentes:
            </p>
            <div className="flex flex-wrap gap-4">
              <Check
                checked={datos.fuenteSalario}
                onChange={(v) => set('fuenteSalario', v)}
                texto="Salario"
              />
              <Check
                checked={datos.fuenteHonorarios}
                onChange={(v) => set('fuenteHonorarios', v)}
                texto="Serv./honorarios profesionales"
              />
              <Check
                checked={datos.fuenteVentaActivos}
                onChange={(v) => set('fuenteVentaActivos', v)}
                texto="Venta de activos"
              />
              <Check
                checked={datos.fuenteOtro}
                onChange={(v) => set('fuenteOtro', v)}
                texto="Otro"
              />
            </div>
            {datos.fuenteOtro && (
              <Campo label="Cual?">
                <input
                  value={datos.fuenteOtroCual}
                  onChange={(e) => set('fuenteOtroCual', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            )}
          </Seccion>

          {/* 11. Beneficiario final */}
          <Seccion numero={11} titulo="Beneficiario final">
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
              <Campo label="Pais">
                <input
                  value={datos.bfPais}
                  onChange={(e) => set('bfPais', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono">
                <input
                  value={datos.bfTelefono}
                  onChange={(e) => set('bfTelefono', e.target.value)}
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

          {/* Autorizaciones */}
          <Seccion numero={12} titulo="Autorizaciones y declaraciones">
            <div className="space-y-3">
              <Check
                checked={datos.autorizaDatos}
                onChange={(v) => set('autorizaDatos', v)}
                texto="Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012."
              />
              <Check
                checked={datos.declaraVeracidad}
                onChange={(v) => set('declaraVeracidad', v)}
                texto="Declaro bajo la gravedad de juramento que el origen de los fondos es licito y que la informacion es veraz."
              />
            </div>
          </Seccion>

          {/* Estado (uso interno) + acciones */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <Campo label="Estado del registro">
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
                      : 'Crear registro'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!mostrarForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por proveedor, NIT o consecutivo..."
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
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">NIT / CC</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
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
                      {r.proveedor}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.nit ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.tipoProveedor ?? '-'}
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
                        ? 'Cargando registros...'
                        : error
                          ? `Error: ${error}`
                          : busqueda || filtroEstado
                            ? 'Sin resultados para la busqueda.'
                            : 'Sin registros de proveedores.'}
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
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar el registro de "${aEliminar.proveedor}".`}
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

function BloqueContacto({
  titulo,
  contacto,
  onSet,
}: {
  titulo: string
  contacto: Contacto
  onSet: (campo: keyof Contacto, valor: string) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          value={contacto.nombre}
          onChange={(e) => onSet('nombre', e.target.value)}
          placeholder="Nombre"
          className={inputClase}
        />
        <input
          value={contacto.cargo}
          onChange={(e) => onSet('cargo', e.target.value)}
          placeholder="Cargo"
          className={inputClase}
        />
        <input
          value={contacto.telefono}
          onChange={(e) => onSet('telefono', e.target.value)}
          placeholder="Telefono"
          data-no-upper
          className={inputClase}
        />
        <input
          value={contacto.email}
          onChange={(e) => onSet('email', e.target.value)}
          placeholder="Email"
          data-no-upper
          className={inputClase}
        />
      </div>
    </div>
  )
}

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
}: {
  opciones: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => {
        const activo = value === op
        return (
          <button
            key={op}
            type="button"
            onClick={() => onChange(activo ? '' : op)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activo
                ? 'border-brand-600 bg-brand-600 text-white'
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

function Check({
  checked,
  onChange,
  texto,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  texto: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-slate-600">{texto}</span>
    </label>
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
