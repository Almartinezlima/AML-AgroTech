import Link from 'next/link'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseEnlace, claseTarjeta, claseTextoError } from '@/components/ui/estilos'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PagoAdmin } from '@/types/comercio'
import { LuExternalLink } from 'react-icons/lu'

interface TarjetaPagoProps {
  pago: PagoAdmin
  onAprobar: () => void
  onRechazar: () => void
  onReembolsar: () => void
}

// Un pago en tres partes: quién y estado · datos · monto y acciones
export default function TarjetaPago({ pago, onAprobar, onRechazar, onReembolsar }: TarjetaPagoProps) {
  return (
    <li className={claseTarjeta}>
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <Link href={`/pedidos/${pago.pedido_id}`} className={`${claseEnlace} font-titulo text-lg`}>{pago.pedidos?.codigo}</Link>
          <p className="text-texto font-medium break-words">{pago.cliente?.nombre ?? 'Cliente'}</p>
        </div>
        <Insignia info={INFO_ESTADO_PAGO[pago.estado]} />
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 pb-3 text-sm sm:grid-cols-2">
        <div className="flex gap-1.5"><dt className="text-texto-2">Método:</dt><dd className="text-texto">{ETIQUETA_METODO[pago.metodo]}</dd></div>
        {pago.pedidos?.estado === 'cancelado' && (
          <div className="flex gap-1.5"><dt className="text-texto-2">Pedido:</dt><dd className="text-texto">Cancelado</dd></div>
        )}
        {pago.motivo_rechazo && (
          <div className="flex gap-1.5 sm:col-span-2"><dt className="shrink-0 text-texto-2">Motivo:</dt><dd className={`${claseTextoError} min-w-0 break-words`}>{pago.motivo_rechazo}</dd></div>
        )}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-borde bg-tarjeta-hover/40 px-4 py-3">
        <span className="font-titulo text-xl font-bold tabular-nums text-texto">{formatoBs(pago.monto)}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {pago.comprobante_url && (
            <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className={claseBoton('suave', 'chico')}>
              <LuExternalLink className="h-4 w-4" aria-hidden="true" /> Ver comprobante
            </a>
          )}
          {pago.estado === 'reembolso_pendiente' && (
            <button onClick={onReembolsar} className={claseBoton('primario', 'chico')}>Marcar como reembolsado</button>
          )}
          {pago.estado === 'en_revision' && (
            <>
              <button onClick={onRechazar} className={claseBoton('peligro', 'chico')}>Rechazar</button>
              <button onClick={onAprobar} className={claseBoton('primario', 'chico')}>Aprobar</button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
