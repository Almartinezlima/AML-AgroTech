import { claseTextoEstado } from '@/components/ui/Insignia'
import { ETIQUETA_SEGUIMIENTO_ORDEN, INFO_ESTADO_ORDEN } from '@/lib/abastecimiento/ordenes'
import { fechaHora } from '@/lib/ecommerce/presentacion'
import type { EventoOrdenCompra } from '@/types/abastecimiento'

const CLASE_PUNTO: Record<string, string> = {
  '#f59e0b': 'bg-estado-pendiente',
  '#3b82f6': 'bg-estado-camino',
  '#22c55e': 'bg-estado-ok',
  '#ef4444': 'bg-estado-error',
}

// Línea de tiempo de una orden de compra (la usan el admin y el proveedor)
export default function LineaTiempoOrden({ eventos }: { eventos: EventoOrdenCompra[] }) {
  if (eventos.length === 0) return <p className="text-sm text-texto-2">Todavía no hay movimientos.</p>

  return (
    <ol className="flex flex-col" aria-label="Línea de tiempo de la orden">
      {eventos.map((evento, i) => {
        const info = INFO_ESTADO_ORDEN[evento.estado]
        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${CLASE_PUNTO[info.color]}`} aria-hidden="true" />
              {i < eventos.length - 1 && <span className="w-0.5 flex-1 bg-borde" aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-5">
              <p className={`text-sm font-semibold ${claseTextoEstado(info.color)}`}>{ETIQUETA_SEGUIMIENTO_ORDEN[evento.estado]}</p>
              {evento.nota && <p className="text-sm text-texto break-words">{evento.nota}</p>}
              <p className="mt-0.5 text-xs text-texto-2">{fechaHora(evento.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
