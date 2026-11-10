import type { ReactNode } from 'react'
import Marca from '@/components/Marca'

interface MarcoAccesoProps {
  titulo: string
  subtitulo?: string
  children: ReactNode
  // Enlaces debajo del formulario ("¿No tienes cuenta? …")
  pie?: ReactNode
}

// Marco común de login, registro, recuperar y restablecer
export default function MarcoAcceso({ titulo, subtitulo, children, pie }: MarcoAccesoProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-fondo px-4 py-12 flex items-center justify-center">
      {/* Halo verde de fondo, decorativo */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-acento/10 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-md animate-entrada">
        <div className="text-center mb-8">
          <div className="mb-5"><Marca tamano="grande" /></div>
          <h1 className="font-titulo text-3xl font-bold tracking-tight text-texto">{titulo}</h1>
          {subtitulo && <p className="text-texto-2 mt-2">{subtitulo}</p>}
        </div>

        <div className="bg-tarjeta border border-borde rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/30">
          {children}
          {pie && <div className="mt-6 pt-6 border-t border-borde text-center text-sm text-texto-2">{pie}</div>}
        </div>
      </div>
    </div>
  )
}
