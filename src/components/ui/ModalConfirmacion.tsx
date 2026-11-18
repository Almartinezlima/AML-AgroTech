'use client'
import { useCerrarModal } from '@/lib/ui/useCerrarModal'
import { Aviso } from '@/components/ui/Estados'
import { claseBoton } from '@/components/ui/estilos'

interface ModalConfirmacionProps {
  titulo: string
  mensaje: string
  textoConfirmar: string
  // Texto del botón que cierra sin hacer nada (por defecto "Cancelar")
  textoCancelar?: string
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
  textoCancelar = 'Cancelar',
  peligro = false,
  procesando = false,
  error,
  onConfirmar,
  onCancelar,
}: ModalConfirmacionProps) {
  // Esc y Atrás cierran sin hacer nada (fase 9E)
  useCerrarModal(onCancelar, procesando)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-texto/60 backdrop-blur-sm px-4"
      onClick={() => { if (!procesando) onCancelar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        aria-describedby="modal-mensaje"
        className="w-full min-w-0 max-w-md max-h-[90dvh] overflow-y-auto overflow-x-hidden bg-tarjeta border border-borde rounded-2xl p-5 sm:p-6 shadow-flotante animate-entrada"
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
            className={claseBoton('secundario')}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={onConfirmar}
            className={claseBoton(peligro ? 'peligro-lleno' : 'primario')}
          >
            {procesando ? 'Guardando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
