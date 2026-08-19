import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Combobox con buscador: al desplegar muestra un input para filtrar opciones.
// El panel se renderiza en un portal para que no lo recorte ningun contenedor
// y siempre quede por encima del resto del formulario.
export function SelectorBuscable({
  value,
  onChange,
  opciones,
  placeholder = 'Seleccione...',
  disabled = false,
  disabledText,
  editable = false,
}: {
  value: string
  onChange: (v: string) => void
  opciones: string[]
  placeholder?: string
  disabled?: boolean
  disabledText?: string
  editable?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState<{
    top: number
    left: number
    width: number
    abajo: boolean
  } | null>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const recalcular = () => {
    if (!boton.current) return
    const r = boton.current.getBoundingClientRect()
    const espacioAbajo = window.innerHeight - r.bottom
    const abajo = espacioAbajo > 280 || espacioAbajo > r.top
    setRect({
      top: abajo ? r.bottom + 4 : r.top - 4,
      left: r.left,
      width: r.width,
      abajo,
    })
  }

  useLayoutEffect(() => {
    if (abierto) recalcular()
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (boton.current?.contains(t) || panel.current?.contains(t)) return
      setAbierto(false)
    }
    function onScroll() {
      recalcular()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [abierto])

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return opciones
    return opciones.filter((op) => op.toLowerCase().includes(q))
  }, [opciones, query])

  const inputClase =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <>
      <button
        ref={boton}
        type="button"
        disabled={disabled}
        onClick={() => {
          setAbierto((a) => !a)
          setQuery(editable ? value : '')
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 px-3 py-2 text-left text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
          disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-white'
        }`}
      >
        <span className={`uppercase ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {value || (disabled ? disabledText || placeholder : placeholder)}
        </span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 flex-none text-slate-400"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {abierto &&
        !disabled &&
        rect &&
        createPortal(
          <div
            ref={panel}
            style={{
              position: 'fixed',
              top: rect.abajo ? rect.top : undefined,
              bottom: rect.abajo ? undefined : window.innerHeight - rect.top,
              left: rect.left,
              width: rect.width,
            }}
            className="z-[9999] rounded-md border border-slate-200 bg-white shadow-lg"
          >
            <div className="p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (editable) onChange(e.target.value)
                }}
                placeholder={editable ? 'Seleccione o escriba...' : 'Buscar...'}
                className={`${inputClase} uppercase`}
              />
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtradas.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">
                  Sin resultados
                </li>
              )}
              {filtradas.map((op) => (
                <li key={op}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(op)
                      setAbierto(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm uppercase hover:bg-brand-50 ${
                      op === value
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {op}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
