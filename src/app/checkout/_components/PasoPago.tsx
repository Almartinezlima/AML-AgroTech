import type { IconType } from 'react-icons'
import { LuBanknote, LuLandmark, LuQrCode } from 'react-icons/lu'
import ErrorCampo, { propsCampo } from '@/components/ui/ErrorCampo'
import { claseEtiqueta } from '@/components/ui/estilos'
import { ETIQUETA_METODO } from '@/lib/ecommerce/presentacion'
import { transferenciaDisponible } from '@/lib/pagos/banco'
import type { MetodoPago, ZonaEnvio } from '@/types/comercio'
import { TEXTO_SOLO_EFECTIVO } from './mensajesCompra'

const OPCIONES: Array<{ valor: MetodoPago; descripcion: string; icono: IconType }> = [
  { valor: 'qr', descripcion: 'Pagas con la app de tu banco y subes la foto del pago. Es lo más rápido.', icono: LuQrCode },
  { valor: 'transferencia', descripcion: 'Transfieres a la cuenta de la tienda y subes la foto del pago.', icono: LuLandmark },
  { valor: 'contra_entrega', descripcion: 'Pagas en efectivo cuando recibes o recoges tu pedido. Lo preparamos al momento.', icono: LuBanknote },
]

interface PasoPagoProps {
  zona?: ZonaEnvio
  metodo: MetodoPago | null
  error?: string
  onCambiar: (metodo: MetodoPago) => void
}

// Forma de pago (fase 9E): QR viene marcado. Efectivo al recibir no se esconde en las zonas
// que no lo permiten: queda desactivado y dice dónde sí se puede.
export default function PasoPago({ zona, metodo, error, onCambiar }: PasoPagoProps) {
  // Sin la cuenta del banco configurada no se ofrece transferencia (nunca datos falsos)
  const opciones = OPCIONES.filter((o) => o.valor !== 'transferencia' || transferenciaDisponible)

  return (
    <fieldset id="metodo" className="flex min-w-0 flex-col gap-3" {...propsCampo('metodo', error)}>
      <legend className={`${claseEtiqueta} text-base font-semibold text-texto`}>¿Cómo quieres pagar?</legend>
      {opciones.map((o) => {
        const sinEfectivo = o.valor === 'contra_entrega' && zona !== undefined && !zona.permite_contra_entrega
        const elegido = o.valor === metodo && !sinEfectivo
        return (
          <label
            key={o.valor}
            className={`flex items-center gap-3 rounded-2xl border bg-tarjeta p-4 transition ${
              sinEfectivo ? 'cursor-not-allowed border-borde bg-tarjeta-hover/50' : 'cursor-pointer hover:border-acento'
            } ${elegido ? 'border-acento ring-2 ring-acento/20' : error ? 'border-estado-error' : 'border-borde'}`}
          >
            <input type="radio" name="metodo" disabled={sinEfectivo} checked={elegido} onChange={() => onCambiar(o.valor)}
              className="h-5 w-5 shrink-0 accent-acento" />
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${sinEfectivo ? 'bg-tarjeta-hover text-texto-2' : 'bg-acento/10 text-acento'}`}>
              <o.icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block font-semibold ${sinEfectivo ? 'text-texto-2' : 'text-texto'}`}>{ETIQUETA_METODO[o.valor]}</span>
              <span className="block text-sm text-texto-2">{sinEfectivo ? TEXTO_SOLO_EFECTIVO : o.descripcion}</span>
            </span>
          </label>
        )
      })}
      <ErrorCampo campo="metodo" mensaje={error} />
    </fieldset>
  )
}
