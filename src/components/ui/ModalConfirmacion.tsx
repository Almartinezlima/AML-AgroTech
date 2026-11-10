'use client'
import { useEffect } from 'react'
import { Aviso } from '@/components/ui/Estados'

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={() => { if (!procesando) onCancelar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        aria-describedby="modal-mensaje"
        className="w-full max-w-md bg-tarjeta border border-borde rounded-2xl p-6 shadow-2xl shadow-black/10 animate-entrada"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id="modal-titulo" className="font-titulo text-xl font-bold text-texto mb-2">{titulo}</h2>
        <p id="modal-mensaje" className="text-texto-2 text-sm break-words mb-5">{mensaje}</p>

        {error && (
          <div className="mb-5"><Aviso tipo="error">{error}</Aviso></div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={procesando}
            onClick={onCancelar}
            className="border border-borde hover:border-acento disabled:opacity-60 text-texto font-semibold px-5 py-2.5 rounded-xl transition-colors"
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
                : 'bg-acento hover:bg-acento-hover text-white'
            }`}
          >
            {procesando ? 'Guardando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
