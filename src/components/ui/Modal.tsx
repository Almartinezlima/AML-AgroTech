'use client'
import type { ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import { useCerrarModal } from '@/lib/ui/useCerrarModal'

interface ModalProps {
  titulo: string
  bloqueado?: boolean
  onCerrar: () => void
  children: ReactNode
}

// Contenedor para modales con formulario. Se cierra con la X, Esc, clic afuera o Atrás (fase 9E).
export default function Modal({ titulo, bloqueado = false, onCerrar, children }: ModalProps) {
  useCerrarModal(onCerrar, bloqueado)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-texto/60 backdrop-blur-sm px-4"
      onClick={() => { if (!bloqueado) onCerrar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="w-full min-w-0 max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden overscroll-contain bg-tarjeta border border-borde rounded-2xl p-5 sm:p-6 shadow-flotante animate-entrada"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words font-titulo text-xl font-bold text-texto">{titulo}</h2>
          <button type="button" onClick={onCerrar} disabled={bloqueado} aria-label="Cerrar"
            className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-texto-2 transition hover:bg-tarjeta-hover hover:text-texto disabled:opacity-50">
            <LuX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
