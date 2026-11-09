import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import { claseEtiqueta, claseTarjeta } from '@/components/ui/estilos'
import type { MetodoPago, ZonaEnvio } from '@/types/comercio'

const OPCIONES: Array<{ valor: MetodoPago; titulo: string; descripcion: string; icono: string }> = [
  { valor: 'qr', titulo: 'QR', descripcion: 'Pagas desde la app de tu banco y subes el comprobante', icono: '📱' },
  { valor: 'transferencia', titulo: 'Transferencia', descripcion: 'Transfieres a la cuenta de la tienda y subes el comprobante', icono: '🏦' },
  { valor: 'contra_entrega', titulo: 'Contra entrega', descripcion: 'Pagas en efectivo al recibir o recoger', icono: '💵' },
]

interface PasoPagoProps {
  zona: ZonaEnvio
  metodo: MetodoPago | null
  onCambiar: (metodo: MetodoPago) => void
}

export default function PasoPago({ zona, metodo, onCambiar }: PasoPagoProps) {
  const opciones = OPCIONES.filter((o) => o.valor !== 'contra_entrega' || zona.permite_contra_entrega)

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className={claseEtiqueta}>¿Cómo quieres pagar?</legend>
        {opciones.map((o) => (
          <label key={o.valor} className={`${claseTarjeta} p-4 flex items-center gap-3 cursor-pointer hover:border-[#22c55e] ${o.valor === metodo ? 'border-[#22c55e] bg-[#162016]' : ''}`}>
            <input type="radio" name="metodo" checked={o.valor === metodo} onChange={() => onCambiar(o.valor)} className="accent-[#22c55e]" />
            <span className="text-2xl">{o.icono}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[#f0fdf4] font-semibold">{o.titulo}</span>
              <span className="block text-[#86efac] text-xs">{o.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {!zona.permite_contra_entrega && (
        <p className="text-[#86efac] text-xs">El pago contra entrega no está disponible para envíos a {zona.nombre}.</p>
      )}

      {metodo && (
        <div className={`${claseTarjeta} p-4`}>
          <InstruccionesPago metodo={metodo} />
        </div>
      )}
    </div>
  )
}
