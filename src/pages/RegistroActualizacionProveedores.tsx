import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoRegistroActualizacionProveedor } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { RegistroActualizacionProveedor } from '../types/trazabilidad'

// --------------------------------------------------------------------------
// Modelo del formato FOR-DC-001 (Registro y/o actualizacion de proveedores).
// Todo el detalle se guarda en el campo `datos` (JSONB); los campos resumen
// (proveedor, documento, etc.) se derivan para el listado.
// --------------------------------------------------------------------------

interface PersonaContacto {
  area: string
  nombre: string
  cargo: string
  telefono: string
  email: string
}

interface FormDatos {
  tipoRegistro: string
  fecha: string
  // 1. Identificacion del proveedor
  nombreRazonSocial: string
  ccRut: string
  naturalezaJuridica: string
  tipoSociedad: string
  tipoSociedadOtra: string
  aniosOperacion: string
  sedePrincipal: string
  direccion: string
  ciudad: string
  departamento: string
  pais: string
  telefonoPrincipal: string
  otroTelefono: string
  fax: string
  email: string
  celular: string
  paginaWeb: string
  sucursalesCiudades: string
  // 2. Actividad economica y condiciones comerciales
  ventaProductos: boolean
  ventaServicios: boolean
  otroActividad: boolean
  otroActividadCual: string
  descripcionProductoServicio: string
  clasificacion: string
  tipo: string
  plazoFacturas: string
  // 3. Representante legal y personas de contacto
  nombreRepLegal: string
  ccRepLegal: string
  cargoRepLegal: string
  personasContacto: PersonaContacto[]
  // 4. Servicio al cliente
  servicioTecnico: string
  manejaStock: string
  servicioMantenimiento: string
  suministraDireccion: string
  recibeDevoluciones: string
  asumeTransporte: string
  // 5. Informacion tributaria
  responsableIVA: string
  retencionFuente: string
  granContribuyente: string
  autoretenedor: string
  regimenComun: string
  sujetoRetencion: string
  regimenSimplificado: string
  otrosTributaria: string
  noResponsableIVA: string
  actividadEconomicaNo: string
  // 6. Calidad y SG-SST
  certificadoCalidad: string
  cumpleDecreto1072: string
  // 7. Cuenta bancaria
  banco: string
  sucursalBanco: string
  numeroCuenta: string
  tipoCuenta: string
  titularCuenta: string
}

const TIPOS_REGISTRO = ['Inscripcion', 'Actualizacion de datos']
const NATURALEZAS = ['Persona Natural', 'Persona Juridica']
const TIPOS_SOCIEDAD = [
  'Sociedad Anonima',
  'Sociedad Limitada',
  'Empresa Unipersonal',
  'Empresa Estatal',
  'Sucursal Colombia empresa extranjera',
  'Empresa Extranjera',
  'Otra',
]
const CLASIFICACIONES = [
  'Proveedor de servicios',
  'Contratista de obra',
  'Consultor-Asesor',
  'Proveedor de bienes',
]
const TIPOS = ['Fabricante', 'Representante', 'Distribuidor']
const PLAZOS = ['Contado', '30 dias', '60 dias', 'Mas de 60 dias']
const TIPOS_CUENTA = ['Corriente', 'Ahorros']
const SI_NO = ['Si', 'No']
const ESTADOS = ['Pendiente', 'Aprobado', 'Rechazado']

const personaContactoVacia = (): PersonaContacto => ({
  area: '',
  nombre: '',
  cargo: '',
  telefono: '',
  email: '',
})

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const datosVacio = (): FormDatos => ({
  tipoRegistro: 'Inscripcion',
  fecha: hoy(),
  nombreRazonSocial: '',
  ccRut: '',
  naturalezaJuridica: 'Persona Juridica',
  tipoSociedad: '',
  tipoSociedadOtra: '',
  aniosOperacion: '',
  sedePrincipal: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  pais: '',
  telefonoPrincipal: '',
  otroTelefono: '',
  fax: '',
  email: '',
  celular: '',
  paginaWeb: '',
  sucursalesCiudades: '',
  ventaProductos: false,
  ventaServicios: false,
  otroActividad: false,
  otroActividadCual: '',
  descripcionProductoServicio: '',
  clasificacion: '',
  tipo: '',
  plazoFacturas: '',
  nombreRepLegal: '',
  ccRepLegal: '',
  cargoRepLegal: '',
  personasContacto: [personaContactoVacia()],
  servicioTecnico: '',
  manejaStock: '',
  servicioMantenimiento: '',
  suministraDireccion: '',
  recibeDevoluciones: '',
  asumeTransporte: '',
  responsableIVA: '',
  retencionFuente: '',
  granContribuyente: '',
  autoretenedor: '',
  regimenComun: '',
  sujetoRetencion: '',
  regimenSimplificado: '',
  otrosTributaria: '',
  noResponsableIVA: '',
  actividadEconomicaNo: '',
  certificadoCalidad: '',
  cumpleDecreto1072: '',
  banco: '',
  sucursalBanco: '',
  numeroCuenta: '',
  tipoCuenta: '',
  titularCuenta: '',
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

export function RegistroActualizacionProveedores() {
  const [registros, setRegistros] = useState<
    RegistroActualizacionProveedor[]
  >([])
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

  const [aEliminar, setAEliminar] =
    useState<RegistroActualizacionProveedor | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getRegistroActualizacionProveedores())
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

  const formValido = useMemo(
    () => datos.nombreRazonSocial.trim() !== '',
    [datos],
  )

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (filtroEstado && (r.estado ?? '') !== filtroEstado) return false
      if (!t) return true
      return (
        r.proveedor.toLowerCase().includes(t) ||
        (r.documento ?? '').toLowerCase().includes(t) ||
        (r.telefono ?? '').toLowerCase().includes(t) ||
        (r.consecutivo ?? '').toLowerCase().includes(t)
      )
    })
  }, [registros, busqueda, filtroEstado])

  const kpis = useMemo(() => {
    let pendientes = 0
    let aprobados = 0
    let actualizaciones = 0
    registros.forEach((r) => {
      if (r.estado === 'Aprobado') aprobados += 1
      else if (r.estado !== 'Rechazado') pendientes += 1
      if ((r.tipoRegistro ?? '').toLowerCase().includes('actualiz'))
        actualizaciones += 1
    })
    return {
      total: registros.length,
      pendientes,
      aprobados,
      actualizaciones,
    }
  }, [registros])

  function set<K extends keyof FormDatos>(campo: K, valor: FormDatos[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  function setPersona(
    i: number,
    campo: keyof PersonaContacto,
    valor: string,
  ) {
    setDatos((prev) => {
      const arr = prev.personasContacto.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, personasContacto: arr }
    })
  }
  function addPersona() {
    setDatos((prev) => ({
      ...prev,
      personasContacto: [...prev.personasContacto, personaContactoVacia()],
    }))
  }
  function delPersona(i: number) {
    setDatos((prev) => ({
      ...prev,
      personasContacto: prev.personasContacto.filter((_, j) => j !== i),
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

  function abrirEdicion(r: RegistroActualizacionProveedor) {
    setEditandoId(r.id)
    const base = datosVacio()
    const d = (r.datos ?? {}) as Partial<FormDatos>
    setDatos({
      ...base,
      ...d,
      personasContacto:
        d.personasContacto && d.personasContacto.length > 0
          ? d.personasContacto
          : base.personasContacto,
      fecha: r.fecha ?? base.fecha,
      tipoRegistro: r.tipoRegistro ?? d.tipoRegistro ?? base.tipoRegistro,
      clasificacion: r.clasificacion ?? d.clasificacion ?? base.clasificacion,
      nombreRazonSocial: r.proveedor ?? d.nombreRazonSocial ?? '',
      ccRut: r.documento ?? d.ccRut ?? '',
      email: r.correo ?? d.email ?? '',
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
      const payload: NuevoRegistroActualizacionProveedor = {
        fecha: datos.fecha || undefined,
        proveedor: datos.nombreRazonSocial.trim(),
        documento: datos.ccRut.trim() || undefined,
        telefono:
          datos.telefonoPrincipal.trim() ||
          datos.celular.trim() ||
          undefined,
        correo: datos.email.trim() || undefined,
        clasificacion: datos.clasificacion || undefined,
        tipoRegistro: datos.tipoRegistro || undefined,
        estado,
        observaciones: undefined,
        datos: datos as unknown as Record<string, unknown>,
      }
      if (editandoId) {
        const actualizado = await api.actualizarRegistroActualizacionProveedor(
          editandoId,
          payload,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado =
          await api.crearRegistroActualizacionProveedor(payload)
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
      await api.eliminarRegistroActualizacionProveedor(aEliminar.id, password)
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
            Registro y/o actualizacion de proveedores
          </h2>
          <p className="text-slate-500">
            Formato FOR-DC-001 &mdash; Carnes Santacruz
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
          <Kpi titulo="Actualizaciones" valor={kpis.actualizaciones} />
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
                  FOR-DC-001 &middot; Version 0
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
                <Campo label="Fecha">
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

          {/* 1. Identificacion del proveedor */}
          <Seccion numero={1} titulo="Identificacion del proveedor">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Nombre o razon social *">
                <input
                  value={datos.nombreRazonSocial}
                  onChange={(e) => set('nombreRazonSocial', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="CC o RUT">
                <input
                  value={datos.ccRut}
                  onChange={(e) => set('ccRut', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Naturaleza juridica">
                <Pills
                  opciones={NATURALEZAS}
                  value={datos.naturalezaJuridica}
                  onChange={(v) => set('naturalezaJuridica', v)}
                />
              </Campo>
              <Campo label="Anios de operacion">
                <input
                  value={datos.aniosOperacion}
                  onChange={(e) => set('aniosOperacion', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Tipo de sociedad (no aplica para persona natural)">
              <Pills
                opciones={TIPOS_SOCIEDAD}
                value={datos.tipoSociedad}
                onChange={(v) => set('tipoSociedad', v)}
              />
            </Campo>
            {datos.tipoSociedad === 'Otra' && (
              <Campo label="Cual otra sociedad">
                <input
                  value={datos.tipoSociedadOtra}
                  onChange={(e) => set('tipoSociedadOtra', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Sede principal">
                <input
                  value={datos.sedePrincipal}
                  onChange={(e) => set('sedePrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Direccion" className="md:col-span-2">
                <input
                  value={datos.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Ciudad">
                <input
                  value={datos.ciudad}
                  onChange={(e) => set('ciudad', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Departamento">
                <input
                  value={datos.departamento}
                  onChange={(e) => set('departamento', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Pais">
                <input
                  value={datos.pais}
                  onChange={(e) => set('pais', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Telefono principal">
                <input
                  value={datos.telefonoPrincipal}
                  onChange={(e) => set('telefonoPrincipal', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Otro telefono">
                <input
                  value={datos.otroTelefono}
                  onChange={(e) => set('otroTelefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Fax">
                <input
                  value={datos.fax}
                  onChange={(e) => set('fax', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="E-mail">
                <input
                  type="email"
                  value={datos.email}
                  onChange={(e) => set('email', e.target.value)}
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
              <Campo label="Pagina web">
                <input
                  value={datos.paginaWeb}
                  onChange={(e) => set('paginaWeb', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Sucursales / ciudades">
              <input
                value={datos.sucursalesCiudades}
                onChange={(e) => set('sucursalesCiudades', e.target.value)}
                className={inputClase}
              />
            </Campo>
          </Seccion>

          {/* 2. Actividad economica y condiciones comerciales */}
          <Seccion
            numero={2}
            titulo="Actividad economica y condiciones comerciales"
          >
            <Campo label="Actividad">
              <div className="flex flex-wrap gap-3">
                <Check
                  checked={datos.ventaProductos}
                  onChange={(v) => set('ventaProductos', v)}
                  texto="Venta de productos"
                />
                <Check
                  checked={datos.ventaServicios}
                  onChange={(v) => set('ventaServicios', v)}
                  texto="Venta de servicios"
                />
                <Check
                  checked={datos.otroActividad}
                  onChange={(v) => set('otroActividad', v)}
                  texto="Otro"
                />
              </div>
            </Campo>
            {datos.otroActividad && (
              <Campo label="Cual otra actividad">
                <input
                  value={datos.otroActividadCual}
                  onChange={(e) => set('otroActividadCual', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            )}
            <Campo label="Descripcion del producto o servicio ofrecido">
              <textarea
                value={datos.descripcionProductoServicio}
                onChange={(e) =>
                  set('descripcionProductoServicio', e.target.value)
                }
                rows={2}
                className={inputClase}
              />
            </Campo>
            <Campo label="Clasificacion a registrar">
              <Pills
                opciones={CLASIFICACIONES}
                value={datos.clasificacion}
                onChange={(v) => set('clasificacion', v)}
              />
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Tipo">
                <Pills
                  opciones={TIPOS}
                  value={datos.tipo}
                  onChange={(v) => set('tipo', v)}
                />
              </Campo>
              <Campo label="Plazo maximo de vencimiento de facturas">
                <Pills
                  opciones={PLAZOS}
                  value={datos.plazoFacturas}
                  onChange={(v) => set('plazoFacturas', v)}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 3. Representante legal y personas de contacto */}
          <Seccion
            numero={3}
            titulo="Representante legal y personas de contacto"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Nombre representante legal">
                <input
                  value={datos.nombreRepLegal}
                  onChange={(e) => set('nombreRepLegal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="CC">
                <input
                  value={datos.ccRepLegal}
                  onChange={(e) => set('ccRepLegal', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Cargo">
                <input
                  value={datos.cargoRepLegal}
                  onChange={(e) => set('cargoRepLegal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Personas de contacto
                </p>
                <button
                  type="button"
                  onClick={addPersona}
                  className="rounded-md border border-brand-300 px-3 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  + Agregar
                </button>
              </div>
              {datos.personasContacto.map((p, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
                >
                  <input
                    value={p.area}
                    onChange={(e) => setPersona(i, 'area', e.target.value)}
                    placeholder="Area"
                    className={inputClase}
                  />
                  <input
                    value={p.nombre}
                    onChange={(e) => setPersona(i, 'nombre', e.target.value)}
                    placeholder="Nombre"
                    className={inputClase}
                  />
                  <input
                    value={p.cargo}
                    onChange={(e) => setPersona(i, 'cargo', e.target.value)}
                    placeholder="Cargo"
                    className={inputClase}
                  />
                  <input
                    value={p.telefono}
                    onChange={(e) =>
                      setPersona(i, 'telefono', e.target.value)
                    }
                    placeholder="Telefono"
                    data-no-upper
                    className={inputClase}
                  />
                  <input
                    value={p.email}
                    onChange={(e) => setPersona(i, 'email', e.target.value)}
                    placeholder="E-mail"
                    data-no-upper
                    className={inputClase}
                  />
                  <button
                    type="button"
                    onClick={() => delPersona(i)}
                    className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </Seccion>

          {/* 4. Servicio al cliente */}
          <Seccion numero={4} titulo="Servicio al cliente">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FilaSiNo
                label="Ofrece servicio tecnico de asesoria al cliente"
                value={datos.servicioTecnico}
                onChange={(v) => set('servicioTecnico', v)}
              />
              <FilaSiNo
                label="Maneja stock para entrega inmediata"
                value={datos.manejaStock}
                onChange={(v) => set('manejaStock', v)}
              />
              <FilaSiNo
                label="Ofrece servicio de mantenimiento"
                value={datos.servicioMantenimiento}
                onChange={(v) => set('servicioMantenimiento', v)}
              />
              <FilaSiNo
                label="Suministra el material en la direccion del cliente"
                value={datos.suministraDireccion}
                onChange={(v) => set('suministraDireccion', v)}
              />
              <FilaSiNo
                label="Recibe devoluciones de sobrantes"
                value={datos.recibeDevoluciones}
                onChange={(v) => set('recibeDevoluciones', v)}
              />
              <FilaSiNo
                label="Asume el transporte de la mercancia"
                value={datos.asumeTransporte}
                onChange={(v) => set('asumeTransporte', v)}
              />
            </div>
          </Seccion>

          {/* 5. Informacion tributaria */}
          <Seccion numero={5} titulo="Informacion tributaria">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FilaSiNo
                label="Responsable impuesto a las ventas"
                value={datos.responsableIVA}
                onChange={(v) => set('responsableIVA', v)}
              />
              <FilaSiNo
                label="Retencion en la fuente"
                value={datos.retencionFuente}
                onChange={(v) => set('retencionFuente', v)}
              />
              <FilaSiNo
                label="Gran contribuyente"
                value={datos.granContribuyente}
                onChange={(v) => set('granContribuyente', v)}
              />
              <FilaSiNo
                label="Autoretenedor (anexar resolucion)"
                value={datos.autoretenedor}
                onChange={(v) => set('autoretenedor', v)}
              />
              <FilaSiNo
                label="Regimen comun"
                value={datos.regimenComun}
                onChange={(v) => set('regimenComun', v)}
              />
              <FilaSiNo
                label="Sujeto de retencion"
                value={datos.sujetoRetencion}
                onChange={(v) => set('sujetoRetencion', v)}
              />
              <FilaSiNo
                label="Regimen simplificado"
                value={datos.regimenSimplificado}
                onChange={(v) => set('regimenSimplificado', v)}
              />
              <FilaSiNo
                label="Otros"
                value={datos.otrosTributaria}
                onChange={(v) => set('otrosTributaria', v)}
              />
              <FilaSiNo
                label="No responsable de IVA"
                value={datos.noResponsableIVA}
                onChange={(v) => set('noResponsableIVA', v)}
              />
              <Campo label="Actividad economica No.">
                <input
                  value={datos.actividadEconomicaNo}
                  onChange={(e) =>
                    set('actividadEconomicaNo', e.target.value)
                  }
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 6. Calidad y SG-SST */}
          <Seccion numero={6} titulo="Calidad y SG-SST">
            <div className="grid grid-cols-1 gap-4">
              <FilaSiNo
                label="Su empresa cuenta con certificado de la calidad vigente expedido por un organismo acreditado? (anexar)"
                value={datos.certificadoCalidad}
                onChange={(v) => set('certificadoCalidad', v)}
              />
              <FilaSiNo
                label="Su empresa cumple con los requisitos establecidos en el Decreto 1072 de 2015?"
                value={datos.cumpleDecreto1072}
                onChange={(v) => set('cumpleDecreto1072', v)}
              />
            </div>
          </Seccion>

          {/* 7. Cuenta bancaria */}
          <Seccion numero={7} titulo="Cuenta bancaria">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Banco">
                <input
                  value={datos.banco}
                  onChange={(e) => set('banco', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Sucursal">
                <input
                  value={datos.sucursalBanco}
                  onChange={(e) => set('sucursalBanco', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Numero de la cuenta">
                <input
                  value={datos.numeroCuenta}
                  onChange={(e) => set('numeroCuenta', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Tipo de cuenta">
                <Pills
                  opciones={TIPOS_CUENTA}
                  value={datos.tipoCuenta}
                  onChange={(v) => set('tipoCuenta', v)}
                />
              </Campo>
              <Campo label="Titular de la cuenta">
                <input
                  value={datos.titularCuenta}
                  onChange={(e) => set('titularCuenta', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* Estado + acciones */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end gap-4 p-6">
              <Campo label="Estado del registro" className="w-48">
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
              placeholder="Buscar por proveedor, documento o consecutivo..."
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
                  <th className="px-4 py-3 font-medium">CC / RUT</th>
                  <th className="px-4 py-3 font-medium">Clasificacion</th>
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
                      {r.documento ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.clasificacion ?? '-'}
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

function FilaSiNo({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex shrink-0 gap-2">
        {SI_NO.map((op) => {
          const activo = value === op
          return (
            <button
              key={op}
              type="button"
              onClick={() => onChange(activo ? '' : op)}
              className={`rounded-md border px-3 py-1 text-sm font-medium transition ${
                activo
                  ? op === 'Si'
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-red-500 bg-red-500 text-white'
                  : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'
              }`}
            >
              {op}
            </button>
          )
        })}
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
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
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
