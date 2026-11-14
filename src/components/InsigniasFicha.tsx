import { LuMinus, LuTrendingDown, LuTrendingUp } from 'react-icons/lu'
import { INFO_BANDA, INFO_TENDENCIA } from '@/lib/ecommerce/fichaTecnica'
import type { BandaToxicologica, TendenciaPrecio } from '@/types/comercio'

const ICONO_TENDENCIA = { al_alza: LuTrendingUp, estable: LuMinus, a_la_baja: LuTrendingDown }

// Tendencia del mercado: tono neutro para no confundirla con los colores de estado
export function InsigniaTendencia({ tendencia, className = '' }: { tendencia: TendenciaPrecio; className?: string }) {
  const Icono = ICONO_TENDENCIA[tendencia]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-borde bg-tarjeta-hover px-2 py-0.5 text-xs font-medium text-texto-2 ${className}`}>
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {INFO_TENDENCIA[tendencia].etiqueta}
    </span>
  )
}

// Banda toxicológica con su color oficial y siempre con texto (el color no es la única señal)
export function InsigniaBanda({ banda }: { banda: BandaToxicologica }) {
  const info = INFO_BANDA[banda]
  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold"
      style={{ backgroundColor: info.fondo, color: info.texto }}
    >
      {info.etiqueta}
      <span className="font-normal">· {info.peligro}</span>
    </span>
  )
}
