'use client'
import { useEffect } from 'react'

interface ModalConfirmacionProps {
  titulo: string
  mensaje: string
  textoConfirmar: string
  peligro?: boolean
  procesando?: boolean
  error?: string
  onConfirmar: () => void
  onCancelar: () => void
}

// Modal propio del proyecto: reemplaza a window.confirm
export default function ModalConfirmacion({
  titulo,
  mensaje,
  textoConfirmar,
  peligro = false,
  procesando = false,
  error,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !procesando) onCancelar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCancelar, procesando])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={() => { if (!procesando) onCancelar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        aria-describedby="modal-mensaje"
        className="w-full max-w-md bg-[#111811] border border-[#1a2e1a] rounded-2xl p-6"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="modal-titulo" className="text-lg font-bold text-[#f0fdf4] mb-2">{titulo}</h2>
        <p id="modal-mensaje" className="text-[#86efac] text-sm break-words mb-5">{mensaje}</p>

        {error && (
          <div role="alert" className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm mb-5">
            ⚠️ {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={procesando}
            onClick={onCancelar}
            className="border border-[#1a2e1a] hover:border-[#22c55e] disabled:opacity-60 text-[#f0fdf4] font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={onConfirmar}
            className={`font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
              peligro
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a]'
            }`}
          >
            {procesando ? 'Guardando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
