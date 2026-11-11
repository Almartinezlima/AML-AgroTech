import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

type Tono = 'exito' | 'aviso' | 'error' | 'neutro'

const TONOS: Record<Tono, string> = {
  exito: 'bg-acento/10 text-acento ring-acento/30',
  aviso: 'bg-trigo/10 text-trigo ring-trigo/30',
  error: 'bg-red-50 text-red-700 ring-red-300',
  neutro: 'bg-tarjeta-hover text-texto-2 ring-borde',
}

interface ResultadoProps {
  icono: IconType
  titulo: string
  tono?: Tono
  rol?: 'status' | 'alert'
  children?: ReactNode
}

// Mensaje centrado de una pantalla: "listo", "revisa tu correo", "enlace vencido"…
export default function Resultado({ icono: Icono, titulo, tono = 'neutro', rol = 'status', children }: ResultadoProps) {
  return (
    <div role={rol} className="text-center">
      <span className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl ring-1 ${TONOS[tono]}`}>
        <Icono className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="font-titulo text-xl font-bold text-texto mb-2">{titulo}</p>
      {children}
    </div>
  )
}
