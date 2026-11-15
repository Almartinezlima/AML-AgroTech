import { claseTarjeta } from '@/components/ui/estilos'
import { textoFraccionamiento, valoresLinea } from '@/lib/abastecimiento/ordenes'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { formatoBs } from '@/lib/utils'
import type { LineaOrdenCompra } from '@/types/abastecimiento'

interface LineasOrdenProps {
  lineas: LineaOrdenCompra[]
  total: number
  totalRecibido?: number | null
  // Muestra lo recibido y el faltante de cada línea (orden recibida)
  conRecepcion?: boolean
}

// Lo que se pidió: una tarjeta por línea (nunca tabla con scroll en celular) y el total
export default function LineasOrden({ lineas, total, totalRecibido, conRecepcion = false }: LineasOrdenProps) {
  return (
    <section aria-label="Productos de la orden" className={`${claseTarjeta} p-4 sm:p-5`}>
      <ul className="flex flex-col divide-y divide-borde">
        {lineas.map((linea) => {
          const v = valoresLinea(linea)
          return (
            <li key={linea.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="font-semibold text-texto break-words">{linea.producto?.nombre ?? 'Producto'}</p>
                  <p className="text-sm text-texto-2 break-words">{textoFraccionamiento(linea.cantidad, linea)}</p>
                </div>
                <p className="font-semibold tabular-nums text-texto">{formatoBs(v.subtotal)}</p>
              </div>
              <p className="text-xs text-texto-2 tabular-nums">
                {linea.cantidad} × {formatoBs(v.precio)} · costo {formatoBs(v.costoUnidad)} por {v.unidad}
              </p>
              {conRecepcion && linea.cantidad_recibida !== null && (
                <p className={`text-sm ${linea.faltante ? 'text-estado-pendiente-texto' : 'text-estado-ok-texto'}`}>
                  Recibido: {linea.cantidad_recibida} de {linea.cantidad} ({cantidadConUnidad(linea.cantidad_recibida * v.unidades, v.unidad)})
                  {linea.faltante ? ` · faltan ${linea.faltante}` : ' · completo'}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex flex-col gap-1 border-t border-borde pt-4">
        <p className="flex justify-between gap-3 text-texto">
          <span className="font-semibold">Total de la orden</span>
          <span className="font-titulo text-xl font-bold tabular-nums">{formatoBs(total)}</span>
        </p>
        {conRecepcion && totalRecibido !== null && totalRecibido !== undefined && (
          <p className="flex justify-between gap-3 text-sm text-texto-2">
            <span>Total de lo recibido</span>
            <span className="font-semibold tabular-nums">{formatoBs(totalRecibido)}</span>
          </p>
        )}
      </div>
    </section>
  )
}
