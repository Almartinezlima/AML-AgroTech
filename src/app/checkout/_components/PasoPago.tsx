import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import { claseEtiqueta, claseTarjeta } from '@/components/ui/estilos'
import type { MetodoPago, ZonaEnvio } from '@/types/comercio'
import type { IconType } from 'react-icons'
import { LuBanknote, LuLandmark, LuQrCode } from 'react-icons/lu'

const OPCIONES: Array<{ valor: MetodoPago; titulo: string; descripcion: string; icono: IconType }> = [
  { valor: 'qr', titulo: 'QR', descripcion: 'Pagas desde la app de tu banco y subes el comprobante', icono: LuQrCode },
  { valor: 'transferencia', titulo: 'Transferencia', descripcion: 'Transfieres a la cuenta de la tienda y subes el comprobante', icono: LuLandmark },
  { valor: 'contra_entrega', titulo: 'Contra entrega', descripcion: 'Pagas en efectivo al recibir o recoger', icono: LuBanknote },
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
          <label key={o.valor} className={`${claseTarjeta} p-4 flex items-center gap-3 cursor-pointer hover:border-acento ${o.valor === metodo ? 'border-acento bg-tarjeta-hover' : ''}`}>
            <input type="radio" name="metodo" checked={o.valor === metodo} onChange={() => onCambiar(o.valor)} className="accent-acento" />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acento/10 text-acento"><o.icono className="h-5 w-5" aria-hidden="true" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-texto font-semibold">{o.titulo}</span>
              <span className="block text-texto-2 text-xs">{o.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {!zona.permite_contra_entrega && (
        <p className="text-texto-2 text-xs">El pago contra entrega no está disponible para envíos a {zona.nombre}.</p>
      )}

      {metodo && (
        <div className={`${claseTarjeta} p-4`}>
          <InstruccionesPago metodo={metodo} />
        </div>
      )}
    </div>
  )
}
