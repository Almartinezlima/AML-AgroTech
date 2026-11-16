import { claseTextoEstado } from '@/components/ui/Insignia'
import { ETIQUETA_SEGUIMIENTO_CLIENTE, INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import type { EventoSeguimiento } from '@/types/comercio'
import { ETIQUETA_ROL, type RolUsuario } from '@/types/usuarios'

// Rol que se muestra al lado del nombre (el del cliente no hace falta)
const ROLES_PERSONAL: RolUsuario[] = ['admin', 'almacen', 'repartidor']

// "por Aldo Martínez (Administrador) · 16/11 14:32" en hora de Bolivia (migración 0017).
// Sin la 0017 no hay nombres: queda solo la hora.
function quienCuando(evento: EventoSeguimiento) {
  const hora = diaHora(evento.created_at)
  if (evento.es_propio) return `por ti · ${hora}`
  if (!evento.actor_nombre) return hora
  const rol = ROLES_PERSONAL.find((r) => r === evento.actor_rol)
  return `por ${evento.actor_nombre}${rol ? ` (${ETIQUETA_ROL[rol]})` : ''} · ${hora}`
}

export default function LineaTiempo({ eventos }: { eventos: EventoSeguimiento[] }) {
  return (
    <ol className="flex flex-col">
      {eventos.map((evento, i) => {
        const info = INFO_ESTADO_PEDIDO[evento.estado]
        return (
          <li key={evento.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: info.color }} />
              {i < eventos.length - 1 && <span className="w-0.5 flex-1 bg-borde" />}
            </div>
            <div className="pb-5 min-w-0">
              <p className={`font-semibold text-sm ${claseTextoEstado(info.color)}`}>{ETIQUETA_SEGUIMIENTO_CLIENTE[evento.estado]}</p>
              {evento.nota && <p className="text-texto text-sm break-words">{evento.nota}</p>}
              <p className="text-texto-2 text-xs mt-0.5">{quienCuando(evento)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
