import type { ReactNode } from 'react'
import Insignia from '@/components/ui/Insignia'
import { claseTarjeta } from '@/components/ui/estilos'
import { diasDeEntrega, textoCostoPorUnidad, textoUnidades } from '@/lib/abastecimiento/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Presentacion } from '@/types/abastecimiento'

const INSIGNIA_DISPONIBLE = { etiqueta: 'Disponible', color: '#22c55e' }
const INSIGNIA_SIN_STOCK = { etiqueta: 'Sin stock', color: '#f59e0b' }
const INSIGNIA_NO_VENDE = { etiqueta: 'Ya no la vende', color: '#ef4444' }

interface TarjetaPresentacionProps {
  presentacion: Presentacion
  // Días de la ficha, para cuando la presentación no tiene los suyos
  diasFicha: number
  acciones?: ReactNode
}

// Una presentación mayorista: qué producto de la tienda, cuánto trae, cuánto cuesta y en
// cuánto llega. La usan el panel del distribuidor y el admin.
export default function TarjetaPresentacion({ presentacion: p, diasFicha, acciones }: TarjetaPresentacionProps) {
  const insignia = !p.activo ? INSIGNIA_NO_VENDE : p.disponible ? INSIGNIA_DISPONIBLE : INSIGNIA_SIN_STOCK

  return (
    <li className={`${claseTarjeta} flex flex-col gap-3 p-4 ${p.activo ? '' : 'opacity-75'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="font-semibold text-texto break-words">{p.productos?.nombre ?? 'Producto'}</p>
          <p className="text-sm text-texto-2 break-words">
            {p.nombre} · {textoUnidades(p.unidades_por_presentacion, p.productos?.unidad)}
            {p.productos?.sku ? ` · ${p.productos.sku}` : ''}
          </p>
        </div>
        <Insignia info={insignia} />
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div className="flex min-w-0 gap-1.5 sm:flex-col sm:gap-0">
          <dt className="text-texto-2">Precio mayorista:</dt>
          <dd className="font-titulo text-lg font-bold tabular-nums text-texto">{formatoBs(p.precio_mayorista)}</dd>
        </div>
        <div className="flex min-w-0 gap-1.5 sm:flex-col sm:gap-0">
          <dt className="text-texto-2">Por unidad de venta:</dt>
          <dd className="font-semibold tabular-nums text-acento break-words">{textoCostoPorUnidad(p)}</dd>
        </div>
        <div className="flex min-w-0 gap-1.5 sm:flex-col sm:gap-0">
          <dt className="text-texto-2">Entrega:</dt>
          <dd className="text-texto">{diasDeEntrega(p, diasFicha)}</dd>
        </div>
      </dl>

      {acciones && <div className="flex flex-wrap gap-2 border-t border-borde pt-3">{acciones}</div>}
    </li>
  )
}
