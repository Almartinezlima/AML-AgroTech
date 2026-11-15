import { formatoBs } from '@/lib/utils'
import type { MetodoPago } from '@/types/comercio'
import QrPago from './QrPago'

interface InstruccionesPagoProps {
  metodo: MetodoPago
  monto?: number
  codigo?: string
}

// El repo y el sitio son públicos: el QR y la cuenta son siempre de demostración.
// Sin código (checkout, antes de confirmar) solo se explica qué pasa después: el QR
// con el monto exacto se muestra cuando el pedido ya está registrado.
export default function InstruccionesPago({ metodo, monto, codigo }: InstruccionesPagoProps) {
  const registrado = monto !== undefined && codigo !== undefined

  if (metodo === 'contra_entrega') {
    return (
      <p className="text-sm text-texto">
        Pagas en efectivo cuando recibes o recoges tu pedido{monto !== undefined ? `: ${formatoBs(monto)}` : ''}. No tienes que subir comprobante.
      </p>
    )
  }

  if (metodo === 'qr') {
    if (registrado) return <QrPago monto={monto} codigo={codigo} />
    return (
      <p className="text-sm text-texto">
        Al confirmar tu pedido te mostramos el QR con el monto exacto. Pagas desde la app de tu banco y subes la foto del comprobante.
      </p>
    )
  }

  if (!registrado) {
    return (
      <p className="text-sm text-texto">
        Al confirmar tu pedido te mostramos la cuenta y el monto exacto. Transfieres desde tu banco y subes la foto del comprobante.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-estado-pendiente-texto">Cuenta de demostración: no realices pagos reales.</p>
      <div className="rounded-xl bg-tarjeta-hover px-4 py-3">
        <p className="text-sm text-texto-2">Monto exacto a transferir</p>
        <p className="font-titulo text-3xl font-bold tabular-nums text-acento">{formatoBs(monto)}</p>
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Banco</dt><dd className="text-texto">Banco Demo</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Cuenta</dt><dd className="font-mono text-texto">000-000000-0</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Titular</dt><dd className="text-texto">AML AgroTech (demo)</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Referencia (escríbela en la glosa)</dt><dd className="font-semibold text-texto">{codigo}</dd></div>
      </dl>
    </div>
  )
}
