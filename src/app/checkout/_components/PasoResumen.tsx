import { claseTarjeta } from '@/components/ui/estilos'
import { ETIQUETA_METODO, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Cotizacion, MetodoPago, ZonaEnvio } from '@/types/comercio'
import type { DatosEntrega } from './PasoEntrega'

interface PasoResumenProps {
  cotizacion: Cotizacion
  zona: ZonaEnvio
  entrega: DatosEntrega
  metodo: MetodoPago
}

export default function PasoResumen({ cotizacion, zona, entrega, metodo }: PasoResumenProps) {
  return (
    <section aria-label="Resumen del pedido" className="flex flex-col gap-4">
      <div className={`${claseTarjeta} p-4 flex flex-col gap-2`}>
        {cotizacion.items.map((item) => (
          <div key={item.producto_id} className="flex justify-between gap-3 text-sm">
            <span className="text-texto-2 min-w-0 break-words">{item.nombre} × {item.cantidad}</span>
            <span className="text-texto whitespace-nowrap">{formatoBs(item.subtotal)}</span>
          </div>
        ))}
        <div className="border-t border-borde mt-2 pt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-texto-2">Subtotal</span><span className="text-texto">{formatoBs(cotizacion.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-texto-2">Envío</span><span className="text-texto">{formatoBs(cotizacion.costo_envio)}</span></div>
          <div className="flex justify-between font-bold text-lg"><span className="text-texto">Total</span><span className="text-acento">{formatoBs(cotizacion.total)}</span></div>
        </div>
      </div>

      <dl className={`${claseTarjeta} p-4 flex flex-col gap-2 text-sm`}>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Entrega</dt><dd className="text-texto text-right">{zona.nombre} · {tiempoEntrega(zona)}</dd></div>
        {zona.tipo === 'urbano' && (
          <div className="flex justify-between gap-3"><dt className="text-texto-2">Dirección</dt><dd className="text-texto text-right min-w-0 break-words">{entrega.direccion}</dd></div>
        )}
        {zona.tipo === 'provincia' && (
          <div className="flex justify-between gap-3"><dt className="text-texto-2">Recoge en la flota</dt><dd className="text-texto text-right min-w-0 break-words">{entrega.recogeNombre} · CI {entrega.recogeCi.toUpperCase()}</dd></div>
        )}
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Teléfono</dt><dd className="text-texto">{entrega.telefono}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Pago</dt><dd className="text-texto">{ETIQUETA_METODO[metodo]}</dd></div>
      </dl>
    </section>
  )
}
