'use client'
import { useState } from 'react'
import { LuCheck, LuCopy, LuDownload } from 'react-icons/lu'
import { claseBoton } from '@/components/ui/estilos'
import { formatoBs } from '@/lib/utils'

// QR de cobro de la tienda (BNB, sin monto): el cliente escanea y escribe el monto exacto que ve acá.
// Si Render define NEXT_PUBLIC_QR_TIENDA_IMAGEN, esa imagen tiene prioridad; si no, se usa
// public/qr-bnb.jpg (fase 8A).
const QR_TIENDA = process.env.NEXT_PUBLIC_QR_TIENDA_IMAGEN || '/qr-bnb.jpg'

interface QrPagoProps {
  monto: number
  codigo: string
}

export default function QrPago({ monto, codigo }: QrPagoProps) {
  const [copiado, setCopiado] = useState(false)

  const copiarMonto = async () => {
    try {
      await navigator.clipboard.writeText(monto.toFixed(2))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="w-full max-w-60 shrink-0 rounded-2xl border border-borde bg-white p-2 shadow-tarjeta sm:w-56">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática o externa del QR del negocio */}
        <img src={QR_TIENDA} alt={`QR para pagar ${formatoBs(monto)} del pedido ${codigo}`} width={990} height={1561} className="h-auto w-full rounded-xl" />
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="rounded-xl bg-tarjeta-hover px-4 py-3">
          <p className="text-sm text-texto-2">Escribe este monto exacto en tu banco</p>
          <p className="font-titulo text-3xl font-bold tabular-nums text-acento">{formatoBs(monto)}</p>
          <p className="mt-1 text-sm text-texto-2">Referencia (escríbela en el concepto): <span className="font-semibold text-texto">{codigo}</span></p>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-texto">
          <li>Abre la app de tu banco y elige pagar con QR.</li>
          <li>Escanea el QR o súbelo desde tu galería con «Guardar QR».</li>
          <li>Escribe {formatoBs(monto)} y el código {codigo} en el concepto, paga y guarda el comprobante.</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href={QR_TIENDA} download={`QR-AML-AgroTech-${codigo}.jpg`} target="_blank" rel="noopener noreferrer" className={claseBoton('secundario', 'chico')}>
            <LuDownload className="h-4 w-4" aria-hidden="true" /> Guardar QR
          </a>
          <button type="button" onClick={() => void copiarMonto()} className={claseBoton('secundario', 'chico')}>
            {copiado
              ? <><LuCheck className="h-4 w-4" aria-hidden="true" /> Monto copiado</>
              : <><LuCopy className="h-4 w-4" aria-hidden="true" /> Copiar monto</>}
          </button>
        </div>
      </div>
    </div>
  )
}
