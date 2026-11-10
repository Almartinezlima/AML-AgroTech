import { claseTarjeta } from '@/components/ui/estilos'
import { ETIQUETA_METODO, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Cotizacion, MetodoPago, ZonaEnvio } from '@/types/comercio'

interface PasoResumenProps {
  cotizacion: Cotizacion
  zona: ZonaEnvio
  direccion: string
  telefono: string
  metodo: MetodoPago
}

export default function PasoResumen({ cotizacion, zona, direccion, telefono, metodo }: PasoResumenProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className={`${claseTarjeta} p-4 flex flex-col gap-2`}>
        {cotizacion.items.map((item) => (
          <div key={item.producto_id} className="flex justify-between gap-3 text-sm">
            <span className="text-[#86efac] min-w-0 break-words">{item.nombre} × {item.cantidad}</span>
            <span className="text-[#f0fdf4] whitespace-nowrap">{formatoBs(item.subtotal)}</span>
          </div>
        ))}
        <div className="border-t border-[#1a2e1a] mt-2 pt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between"><span className="text-[#86efac]">Subtotal</span><span className="text-[#f0fdf4]">{formatoBs(cotizacion.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-[#86efac]">Envío</span><span className="text-[#f0fdf4]">{formatoBs(cotizacion.costo_envio)}</span></div>
          <div className="flex justify-between font-bold text-lg"><span className="text-[#f0fdf4]">Total</span><span className="text-[#22c55e]">{formatoBs(cotizacion.total)}</span></div>
        </div>
      </div>

      <dl className={`${claseTarjeta} p-4 flex flex-col gap-2 text-sm`}>
        <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Entrega</dt><dd className="text-[#f0fdf4] text-right">{zona.nombre} · {tiempoEntrega(zona)}</dd></div>
        {zona.tipo !== 'recojo' && (
          <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Dirección</dt><dd className="text-[#f0fdf4] text-right min-w-0 break-words">{direccion}</dd></div>
        )}
        <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Teléfono</dt><dd className="text-[#f0fdf4]">{telefono}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Pago</dt><dd className="text-[#f0fdf4]">{ETIQUETA_METODO[metodo]}</dd></div>
      </dl>
    </div>
  )
}
