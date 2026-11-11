import Image from 'next/image'
import { formatoBs } from '@/lib/utils'
import type { MetodoPago } from '@/types/comercio'

interface InstruccionesPagoProps {
  metodo: MetodoPago
  monto?: number
  codigo?: string
}

// El repo y el sitio son públicos: el QR y la cuenta son siempre de demostración
export default function InstruccionesPago({ metodo, monto, codigo }: InstruccionesPagoProps) {
  if (metodo === 'contra_entrega') {
    return (
      <p className="text-texto-2 text-sm">
        Pagas en efectivo cuando recibes o recoges tu pedido{monto !== undefined ? `: ${formatoBs(monto)}` : ''}.
      </p>
    )
  }

  const detalle = (
    <dl className="text-sm flex flex-col gap-1">
      {monto !== undefined && (
        <div className="flex justify-between gap-3">
          <dt className="text-texto-2">Monto exacto</dt>
          <dd className="text-texto font-bold">{formatoBs(monto)}</dd>
        </div>
      )}
      {codigo && (
        <div className="flex justify-between gap-3">
          <dt className="text-texto-2">Referencia</dt>
          <dd className="text-texto font-mono">{codigo}</dd>
        </div>
      )}
    </dl>
  )

  if (metodo === 'qr') {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="bg-white rounded-xl p-2 shrink-0">
          <Image src="/pagos/qr-demo.png" alt="QR de demostración" width={160} height={160} />
        </div>
        <div className="w-full flex flex-col gap-3">
          <p className="text-amber-800 text-sm font-semibold">QR de demostración — no realizar pagos reales</p>
          {detalle}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-amber-800 text-sm font-semibold">Cuenta de demostración — no realizar pagos reales</p>
      <dl className="text-sm flex flex-col gap-1">
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Banco</dt><dd className="text-texto">Banco Demo</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Cuenta</dt><dd className="text-texto font-mono">000-000000-0</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-texto-2">Titular</dt><dd className="text-texto">AML AgroTech (demo)</dd></div>
      </dl>
      {detalle}
    </div>
  )
}
