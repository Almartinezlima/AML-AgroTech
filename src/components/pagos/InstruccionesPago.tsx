import { DATOS_BANCO } from '@/lib/pagos/banco'
import { formatoBs } from '@/lib/utils'
import type { MetodoPago } from '@/types/comercio'
import BotonCopiar from './BotonCopiar'
import QrPago from './QrPago'

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_TIENDA

// Una fila de la cuenta: "Cuenta  1234567890  [Copiar]"
function DatoCuenta({ titulo, valor, copiable = false, mono = false }: { titulo: string; valor: string; copiable?: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-borde py-2 last:border-b-0">
      <dt className="text-sm text-texto-2">{titulo}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 break-all text-texto ${mono ? 'font-mono font-semibold' : 'font-medium'}`}>{valor}</span>
        {copiable && <BotonCopiar valor={valor} etiqueta={titulo.toLowerCase()} />}
      </dd>
    </div>
  )
}

interface InstruccionesPagoProps {
  metodo: MetodoPago
  monto?: number
  codigo?: string
}

// QR: el de cobro real de la tienda (ver QrPago). Transferencia: la cuenta real de las variables
// NEXT_PUBLIC_BANCO_* (lib/pagos/banco); si faltan, nunca se muestran datos inventados.
// Sin código (checkout, antes de confirmar) solo se explica qué pasa después: el QR
// con el monto exacto se muestra cuando el pedido ya está registrado.
export default function InstruccionesPago({ metodo, monto, codigo }: InstruccionesPagoProps) {
  const registrado = monto !== undefined && codigo !== undefined

  if (metodo === 'contra_entrega') {
    return (
      <p className="text-sm text-texto">
        Pagas en efectivo cuando recibes o recoges tu pedido{monto !== undefined ? `: ${formatoBs(monto)}` : ''}. No tienes que subir ninguna foto.
      </p>
    )
  }

  if (metodo === 'qr') {
    if (registrado) return <QrPago monto={monto} codigo={codigo} />
    return (
      <p className="text-sm text-texto">
        Al confirmar tu pedido te mostramos el QR con el monto exacto. Pagas desde la app de tu banco y subes la foto del pago.
      </p>
    )
  }

  if (!registrado) {
    return (
      <p className="text-sm text-texto">
        Al confirmar tu pedido te mostramos la cuenta y el monto exacto. Transfieres desde tu banco y subes la foto del pago.
      </p>
    )
  }

  // Pedido viejo con transferencia y la cuenta sin configurar: se piden los datos a la tienda
  if (!DATOS_BANCO) {
    return (
      <p className="text-sm text-texto">
        Pide los datos de la cuenta a la tienda{NUMERO_WHATSAPP ? ' por WhatsApp' : ''} y transfiere {formatoBs(monto)} con la referencia {codigo}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-tarjeta-hover px-4 py-3">
        <p className="text-sm text-texto-2">Monto exacto a transferir</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-titulo text-3xl font-bold tabular-nums text-acento">{formatoBs(monto)}</p>
          <BotonCopiar valor={monto.toFixed(2)} etiqueta="monto" />
        </div>
      </div>
      <dl className="flex flex-col">
        <DatoCuenta titulo="Banco" valor={DATOS_BANCO.banco} />
        <DatoCuenta titulo="Tipo de cuenta" valor={DATOS_BANCO.tipo} />
        <DatoCuenta titulo="Cuenta" valor={DATOS_BANCO.cuenta} copiable mono />
        <DatoCuenta titulo="Titular" valor={DATOS_BANCO.titular} copiable />
        <DatoCuenta titulo="Referencia (escríbela en la glosa)" valor={codigo} copiable />
      </dl>
    </div>
  )
}
