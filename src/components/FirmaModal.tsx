import { useEffect, useRef, useState } from 'react'

// Ventana flotante para firmar con el dedo (tactil) o el mouse.
export function FirmaModal({
  onGuardar,
  onCerrar,
}: {
  onGuardar: (dataUrl: string) => void
  onCerrar: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    // Escala segun el tamano real del canvas para trazos nitidos.
    const rect = c.getBoundingClientRect()
    c.width = rect.width
    c.height = rect.height
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvas.current!
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function inicio(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    dibujando.current = true
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvas.current?.setPointerCapture(e.pointerId)
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return
    e.preventDefault()
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setVacio(false)
  }

  function fin() {
    dibujando.current = false
  }

  function limpiar() {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
    setVacio(true)
  }

  function guardar() {
    const c = canvas.current
    if (!c || vacio) return
    onGuardar(c.toDataURL('image/png'))
    onCerrar()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Firma con el dedo</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <canvas
          ref={canvas}
          onPointerDown={inicio}
          onPointerMove={mover}
          onPointerUp={fin}
          onPointerLeave={fin}
          className="h-48 w-full touch-none rounded-md border border-slate-300 bg-white"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={limpiar}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={vacio}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar firma
          </button>
        </div>
      </div>
    </div>
  )
}
