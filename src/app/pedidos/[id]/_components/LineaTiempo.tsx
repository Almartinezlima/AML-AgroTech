import { INFO_ESTADO_PEDIDO, fechaHora } from '@/lib/ecommerce/presentacion'
import type { EventoSeguimiento } from '@/types/comercio'

export default function LineaTiempo({ eventos }: { eventos: EventoSeguimiento[] }) {
  return (
    <ol className="flex flex-col">
      {eventos.map((evento, i) => {
        const info = INFO_ESTADO_PEDIDO[evento.estado]
        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: info.color }} />
              {i < eventos.length - 1 && <span className="w-0.5 flex-1 bg-[#1a2e1a]" />}
            </div>
            <div className="pb-5 min-w-0">
              <p className="font-semibold text-sm" style={{ color: info.color }}>{info.etiqueta}</p>
              {evento.nota && <p className="text-[#f0fdf4] text-sm break-words">{evento.nota}</p>}
              <p className="text-[#86efac] text-xs mt-0.5">{fechaHora(evento.created_at)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
