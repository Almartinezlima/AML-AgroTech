'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { LuCheck, LuCopy, LuDownload } from 'react-icons/lu'
import { claseBoton } from '@/components/ui/estilos'
import { formatoBs } from '@/lib/utils'

// QR de pago con el monto exacto del pedido (fase 4).
// - Opción A (preparada): si Render define NEXT_PUBLIC_QR_TIENDA_IMAGEN (URL de la imagen del QR
//   real del negocio, sin monto), se muestra ese QR y el cliente escribe el monto que ve acá.
//   La imagen nunca va en el repo: el repo y el sitio son públicos.
// - Opción C (por defecto): QR de demostración generado en el navegador con el código y el monto.
//   No cobra: un QR bancario real con monto solo lo puede emitir el banco.
const QR_TIENDA = process.env.NEXT_PUBLIC_QR_TIENDA_IMAGEN

interface QrPagoProps {
  monto: number
  codigo: string
}

export default function QrPago({ monto, codigo }: QrPagoProps) {
  const [imagenDemo, setImagenDemo] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (QR_TIENDA) return
    let vigente = true
    const texto = `AML AgroTech · ${codigo} · ${formatoBs(monto)} · DEMO, no realizar pagos`
    QRCode.toDataURL(texto, { width: 480, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (vigente) setImagenDemo(url) })
      .catch(() => { if (vigente) setImagenDemo(null) })
    return () => { vigente = false }
  }, [monto, codigo])

  const copiarMonto = async () => {
    try {
      await navigator.clipboard.writeText(monto.toFixed(2))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  const imagen = QR_TIENDA ?? imagenDemo

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="shrink-0 rounded-2xl border border-borde bg-tarjeta p-2 shadow-tarjeta">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- QR generado (data:) o imagen externa del negocio
          <img src={imagen} alt={`QR para pagar ${formatoBs(monto)} del pedido ${codigo}`} width={200} height={200} className="h-48 w-48 sm:h-52 sm:w-52" />
        ) : (
          <div className="esqueleto h-48 w-48 rounded-xl sm:h-52 sm:w-52" role="status" aria-label="Preparando el QR" />
        )}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3">
        {!QR_TIENDA && (
          <p className="text-sm font-semibold text-estado-pendiente-texto">QR de demostración: no realices pagos reales con él.</p>
        )}
        <div className="rounded-xl bg-tarjeta-hover px-4 py-3">
          <p className="text-sm text-texto-2">{QR_TIENDA ? 'Escribe este monto exacto en tu banco' : 'Monto exacto a pagar'}</p>
          <p className="font-titulo text-3xl font-bold tabular-nums text-acento">{formatoBs(monto)}</p>
          <p className="mt-1 text-sm text-texto-2">Referencia: <span className="font-semibold text-texto">{codigo}</span></p>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-texto">
          <li>Abre la app de tu banco y elige pagar con QR.</li>
          <li>Escanea el QR o súbelo desde tu galería con «Guardar QR».</li>
          <li>Paga {formatoBs(monto)} y guarda el comprobante.</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          {imagen && (
            <a href={imagen} download={`QR-${codigo}.png`} target={QR_TIENDA ? '_blank' : undefined} rel="noopener noreferrer" className={claseBoton('secundario', 'chico')}>
              <LuDownload className="h-4 w-4" aria-hidden="true" /> Guardar QR
            </a>
          )}
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
