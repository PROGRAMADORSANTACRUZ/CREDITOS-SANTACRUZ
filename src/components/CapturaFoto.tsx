import { useEffect, useRef, useState } from 'react'

// Modal que abre la camara del dispositivo para capturar una foto del rostro.
export function CapturaFoto({
  onCapturar,
  onCerrar,
}: {
  onCapturar: (dataUrl: string) => void
  onCerrar: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    async function iniciar() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (!activo) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          await video.current.play().catch(() => {})
        }
      } catch {
        setError('No se pudo acceder a la camara. Revisa los permisos del navegador.')
      }
    }
    iniciar()
    return () => {
      activo = false
      stream.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capturar() {
    const v = video.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    setPreview(canvas.toDataURL('image/jpeg', 0.85))
  }

  function confirmar() {
    if (preview) {
      onCapturar(preview)
      onCerrar()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Capturar foto del rostro</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : preview ? (
          <img src={preview} alt="Captura" className="w-full rounded-md" />
        ) : (
          <video
            ref={video}
            playsInline
            muted
            className="w-full rounded-md bg-slate-900"
          />
        )}

        <div className="mt-4 flex justify-end gap-2">
          {preview ? (
            <>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Repetir
              </button>
              <button
                type="button"
                onClick={confirmar}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Usar foto
              </button>
            </>
          ) : (
            !error && (
              <button
                type="button"
                onClick={capturar}
                className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Tomar foto
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
