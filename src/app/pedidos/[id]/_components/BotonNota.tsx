import { claseBoton } from '@/components/ui/estilos'
import { MENSAJE_NOTA_NO_DISPONIBLE, nombreArchivoNota, situacionNota } from '@/lib/ecommerce/notaVenta'
import type { PedidoDetalle } from '@/types/comercio'
import { LuFileDown } from 'react-icons/lu'

// "Descargar nota de venta" (fase 7). Un enlace normal a la API: en Android Chrome lo descarga
// como archivo y funciona también dentro de los navegadores de WhatsApp o Facebook.
export default function BotonNota({ pedido }: { pedido: PedidoDetalle }) {
  const situacion = situacionNota(pedido)

  if (situacion === 'no_disponible') {
    // Pendiente: se avisa cuándo estará; cancelado sin confirmar: no hay nada que mostrar
    if (pedido.estado !== 'pendiente') return null
    return <p className="rounded-2xl bg-tarjeta-hover px-4 py-3 text-sm text-texto-2">{MENSAJE_NOTA_NO_DISPONIBLE}</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      <a
        href={`/api/pedidos/${pedido.id}/nota`}
        download={nombreArchivoNota(pedido.codigo)}
        className={`${claseBoton('secundario')} w-full`}
      >
        <LuFileDown className="h-5 w-5" aria-hidden="true" />
        Descargar nota de venta (PDF)
      </a>
      <p className="text-xs text-texto-2 text-center">
        {situacion === 'anulada' ? 'El pedido se canceló: la nota sale marcada como ANULADA.' : 'Documento sin valor fiscal (no es factura).'}
      </p>
    </div>
  )
}
