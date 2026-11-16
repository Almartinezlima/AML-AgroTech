'use client'
import { LuCheck } from 'react-icons/lu'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { diaHora } from '@/lib/ecommerce/presentacion'
import type { ItemPreparacion } from '@/types/almacen'

interface ListaProductosProps {
  items: ItemPreparacion[]
  editable: boolean
  // Ítem que se está guardando (su casilla queda en espera)
  guardando: string | null
  onCambiar: (item: ItemPreparacion, marcado: boolean) => void
}

// Una casilla grande por producto: se marca al ponerlo en la caja
export default function ListaProductos({ items, editable, guardando, onCambiar }: ListaProductosProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const enEspera = guardando === item.id
        return (
          <li key={item.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={item.marcado}
              disabled={!editable || enEspera}
              onClick={() => onCambiar(item, !item.marcado)}
              className={`flex w-full min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed ${
                item.marcado ? 'border-acento bg-acento/5' : 'border-borde bg-tarjeta hover:border-acento'
              } ${enEspera ? 'opacity-60' : ''}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${item.marcado ? 'border-acento bg-acento text-white' : 'border-borde bg-tarjeta'}`}
                aria-hidden="true"
              >
                {item.marcado && <LuCheck className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-semibold break-words ${item.marcado ? 'text-texto-2' : 'text-texto'}`}>{item.nombre_producto}</span>
                <span className="block text-sm text-texto-2">
                  {cantidadConUnidad(item.cantidad, item.unidad)}{item.sku ? ` · ${item.sku}` : ''}
                </span>
                {item.marcado && item.marcado_por && item.marcado_en && (
                  <span className="block text-sm text-acento">En la caja · {item.marcado_por} · {diaHora(item.marcado_en)}</span>
                )}
              </span>
              <span className="shrink-0 font-titulo text-2xl font-bold tabular-nums text-texto">×{item.cantidad}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
