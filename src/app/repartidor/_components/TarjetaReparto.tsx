import Link from 'next/link'
import ContactoCliente from '@/components/entrega/ContactoCliente'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseTarjeta } from '@/components/ui/estilos'
import { INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoReparto } from '@/types/entrega'
import { LuBanknote, LuBox, LuHandshake, LuLock, LuMapPin, LuTruck } from 'react-icons/lu'

const BOTON_GRANDE = `${claseBoton('primario')} w-full min-h-14 text-lg`

interface TarjetaRepartoProps {
  pedido: PedidoReparto
  procesando: boolean
  onTomar: () => void
}

// Un pedido del reparto: dónde va, a quién llamar, cuántos bultos y si hay que cobrar
export default function TarjetaReparto({ pedido, procesando, onTomar }: TarjetaRepartoProps) {
  const porCobrar = pedido.metodo_pago === 'contra_entrega' && !pedido.cobrado

  return (
    <article className={`${claseTarjeta} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-titulo text-xl font-bold text-texto">{pedido.codigo}</p>
          <p className="text-sm text-texto-2">
            {pedido.estado === 'despachado' && pedido.despachado_en
              ? `Salió ${diaHora(pedido.despachado_en)}${pedido.despachado_por && !pedido.es_mio ? ` con ${pedido.despachado_por}` : ''}`
              : `Empacado ${pedido.empacado_en ? diaHora(pedido.empacado_en) : ''}`}
          </p>
        </div>
        <Insignia info={pedido.estado === 'despachado' ? { etiqueta: 'En camino', color: INFO_ESTADO_PEDIDO.despachado.color } : INFO_ESTADO_PEDIDO.empacado} />
      </div>

      <div className="flex items-start gap-2 text-texto">
        <LuMapPin className="mt-1 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold break-words">{pedido.zona ?? '—'}</p>
          {pedido.direccion_entrega && <p className="break-words">{pedido.direccion_entrega}</p>}
          {pedido.notas && <p className="mt-1 text-sm text-texto-2 break-words">Nota: {pedido.notas}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-texto">
        <span className="font-semibold break-words">{pedido.cliente ?? 'Cliente'}</span>
        <span className="inline-flex items-center gap-1.5 text-texto-2">
          <LuBox className="h-4 w-4" aria-hidden="true" /> {pedido.bultos ?? '—'} {pedido.bultos === 1 ? 'bulto' : 'bultos'}
        </span>
      </div>

      {porCobrar && (
        <p className="inline-flex items-center gap-2 self-start rounded-xl bg-estado-pendiente/10 px-3 py-2 font-semibold text-estado-pendiente-texto">
          <LuBanknote className="h-5 w-5" aria-hidden="true" /> Cobrar {formatoBs(pedido.total)} en efectivo
        </p>
      )}
      {pedido.codigo_bloqueado && (
        <p className="inline-flex items-center gap-2 self-start rounded-xl bg-estado-pendiente/10 px-3 py-2 text-sm font-semibold text-estado-pendiente-texto">
          <LuLock className="h-4 w-4" aria-hidden="true" /> Código bloqueado: avisa a la tienda
        </p>
      )}

      <ContactoCliente telefono={pedido.telefono} codigoPedido={pedido.codigo} />

      {pedido.estado === 'empacado' ? (
        <button type="button" disabled={procesando} onClick={onTomar} className={BOTON_GRANDE}>
          <LuTruck className="h-5 w-5" aria-hidden="true" /> Tomar y salir
        </button>
      ) : (
        <Link href={`/repartidor/pedidos/${pedido.id}`} className={BOTON_GRANDE}>
          <LuHandshake className="h-5 w-5" aria-hidden="true" /> Entregar
        </Link>
      )}
    </article>
  )
}
