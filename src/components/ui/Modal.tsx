'use client'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  titulo: string
  bloqueado?: boolean
  onCerrar: () => void
  children: ReactNode
}

// Contenedor para modales con formulario
export default function Modal({ titulo, bloqueado = false, onCerrar, children }: ModalProps) {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !bloqueado) onCerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar, bloqueado])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={() => { if (!bloqueado) onCerrar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-tarjeta border border-borde rounded-2xl p-6 shadow-2xl shadow-black/50 animate-entrada"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 className="font-titulo text-xl font-bold text-texto mb-4">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}
