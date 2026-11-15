import Link from 'next/link'
import type { IconType } from 'react-icons'
import { claseTarjeta } from '@/components/ui/estilos'

// Tono del ícono y de la cifra: verde de la marca, o el color de un estado cuando la cifra
// pide atención (pendiente) o avisa un problema (error)
export type TonoCifra = 'neutro' | 'acento' | 'pendiente' | 'error' | 'camino'

const TONOS: Record<TonoCifra, { icono: string; valor: string }> = {
  neutro: { icono: 'bg-tarjeta-hover text-texto-2', valor: 'text-texto' },
  acento: { icono: 'bg-acento/10 text-acento', valor: 'text-texto' },
  pendiente: { icono: 'bg-estado-pendiente/15 text-estado-pendiente-texto', valor: 'text-estado-pendiente-texto' },
  error: { icono: 'bg-estado-error/10 text-estado-error-texto', valor: 'text-estado-error-texto' },
  camino: { icono: 'bg-estado-camino/10 text-estado-camino-texto', valor: 'text-texto' },
}

export interface CifraProps {
  titulo: string
  valor: string
  detalle?: string
  icono?: IconType
  tono?: TonoCifra
  href?: string
  // Si la tarjeta funciona como filtro (envíos)
  activa?: boolean
  onClick?: () => void
  // Montos largos (Bs.): ocupa las 2 columnas en celular para no cortar la cifra
  ancha?: boolean
}

export function Cifra({ titulo, valor, detalle, icono: Icono, tono = 'neutro', href, activa, onClick, ancha }: CifraProps) {
  const colores = TONOS[tono]
  const contenido = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-texto-2 text-sm font-medium">{titulo}</span>
        {Icono && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${colores.icono}`}>
            <Icono className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className={`mt-1 block font-titulo text-xl sm:text-2xl font-bold tabular-nums break-words ${colores.valor}`}>{valor}</span>
      {detalle && <span className="mt-1 block text-texto-2 text-xs">{detalle}</span>}
    </>
  )
  const base = `${claseTarjeta} flex flex-col p-4 text-left ${ancha ? 'col-span-2 sm:col-span-1' : ''}`
  const interactiva = 'transition hover:border-acento hover:shadow-tarjeta-hover'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={activa}
        className={`${base} ${interactiva} ${activa ? 'border-acento ring-2 ring-acento/25' : ''}`}>
        {contenido}
      </button>
    )
  }
  if (href) return <Link href={href} className={`${base} ${interactiva}`}>{contenido}</Link>
  return <div className={base}>{contenido}</div>
}

// Columnas en escritorio según cuántas cifras haya (clases completas para Tailwind)
const COLUMNAS_ESCRITORIO: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }

// Fila de cifras arriba de cada pantalla del panel: 2 columnas en celular, hasta 4 en escritorio
export default function TarjetasResumen({ cifras, etiqueta }: { cifras: CifraProps[]; etiqueta: string }) {
  return (
    <section aria-label={etiqueta} className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 ${COLUMNAS_ESCRITORIO[cifras.length] ?? 'lg:grid-cols-4'}`}>
      {cifras.map((cifra) => <Cifra key={cifra.titulo} {...cifra} />)}
    </section>
  )
}
