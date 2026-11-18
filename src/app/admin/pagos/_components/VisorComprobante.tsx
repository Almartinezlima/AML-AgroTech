'use client'
import { LuExternalLink, LuX } from 'react-icons/lu'
import { claseBoton } from '@/components/ui/estilos'
import { useCerrarModal } from '@/lib/ui/useCerrarModal'
import { formatoBs } from '@/lib/utils'
import type { PagoAdmin } from '@/types/comercio'

interface VisorComprobanteProps {
  pago: PagoAdmin
  onCerrar: () => void
  onAprobar: () => void
  onRechazar: () => void
}

// Visor del comprobante (foto del pago) en grande (fase 9E). Al lado (abajo en celular), el
// monto esperado en grande para comparar. Se cierra con la X, Esc, clic afuera o Atrás.
export default function VisorComprobante({ pago, onCerrar, onAprobar, onRechazar }: VisorComprobanteProps) {
  useCerrarModal(onCerrar)
  const esperado = pago.pedidos?.total ?? pago.monto
  const enRevision = pago.estado === 'en_revision'

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-texto/90 backdrop-blur-sm lg:flex-row" onClick={onCerrar}>
      <button type="button" onClick={onCerrar} aria-label="Cerrar el comprobante"
        className="absolute right-3 top-3 z-10 grid h-12 w-12 place-items-center rounded-full bg-tarjeta text-texto shadow-flotante transition hover:bg-tarjeta-hover">
        <LuX className="h-6 w-6" aria-hidden="true" />
      </button>

      <div role="dialog" aria-modal="true" aria-label={`Comprobante (foto del pago) de ${pago.pedidos?.codigo ?? 'el pedido'}`}
        className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        {/* La foto ocupa lo que sobra, siempre entera (object-contain) */}
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-3 pt-16 lg:p-8">
          {pago.comprobante_url && (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración del bucket privado
            <img src={pago.comprobante_url} alt={`Comprobante (foto del pago) del pedido ${pago.pedidos?.codigo ?? ''}`}
              className="max-h-full max-w-full rounded-xl bg-white object-contain shadow-flotante"
              onClick={(e) => e.stopPropagation()} />
          )}
        </div>

        <aside className="w-full shrink-0 rounded-t-2xl bg-tarjeta p-4 sm:p-5 lg:w-96 lg:rounded-none lg:p-8 lg:pt-20" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-medium text-texto-2">Monto esperado</p>
          <p className="font-titulo text-4xl font-bold tabular-nums text-acento sm:text-5xl">{formatoBs(esperado)}</p>
          <p className="mt-1 break-words text-texto">
            {pago.pedidos?.codigo}{pago.cliente?.nombre ? ` · ${pago.cliente.nombre}` : ''}
          </p>
          <p className="mt-1 text-sm text-texto-2">Revisa que la foto del pago diga este monto exacto.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {enRevision && (
              <>
                <button type="button" onClick={onAprobar} className={`${claseBoton('primario')} order-2 lg:order-1`}>Aprobar</button>
                <button type="button" onClick={onRechazar} className={`${claseBoton('peligro')} order-1 lg:order-2`}>Rechazar</button>
              </>
            )}
            {pago.comprobante_url && (
              <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className={`${claseBoton('secundario', 'chico')} order-3 col-span-2 lg:col-span-1`}>
                <LuExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir en otra pestaña
              </a>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
