'use client'
import { useCallback, useState } from 'react'
import { LuCheck, LuCopy, LuDownload, LuMaximize2, LuX } from 'react-icons/lu'
import { claseBoton } from '@/components/ui/estilos'
import { useCerrarModal } from '@/lib/ui/useCerrarModal'
import { formatoBs } from '@/lib/utils'

// QR de cobro de la tienda (BNB, sin monto): el cliente escanea y escribe el monto exacto que ve acá.
// Si Render define NEXT_PUBLIC_QR_TIENDA_IMAGEN, esa imagen tiene prioridad; si no, se usa
// public/qr-bnb.jpg (fase 8A). Fase 9F: el QR va grande (todo el ancho en celular) y se puede abrir
// a pantalla completa para escanearlo desde otro teléfono.
const QR_TIENDA = process.env.NEXT_PUBLIC_QR_TIENDA_IMAGEN || '/qr-bnb.jpg'

interface QrPagoProps {
  monto: number
  codigo: string
}

// Pantalla completa sobre fondo blanco: se cierra con la X, Esc, clic afuera o Atrás
function QrPantallaCompleta({ alt, onCerrar }: { alt: string; onCerrar: () => void }) {
  useCerrarModal(onCerrar, false)
  return (
    <div role="dialog" aria-modal="true" aria-label="QR para pagar" onClick={onCerrar}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white p-3">
      <button type="button" onClick={onCerrar} aria-label="Cerrar"
        className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-black/80 text-white shadow-flotante">
        <LuX className="h-6 w-6" aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática o externa del QR del negocio */}
      <img src={QR_TIENDA} alt={alt} width={990} height={1561} onClick={(e) => e.stopPropagation()}
        className="h-auto max-h-full w-auto max-w-full object-contain" />
    </div>
  )
}

export default function QrPago({ monto, codigo }: QrPagoProps) {
  const [copiado, setCopiado] = useState(false)
  const [grande, setGrande] = useState(false)
  const cerrarGrande = useCallback(() => setGrande(false), [])
  const alt = `QR para pagar ${formatoBs(monto)} del pedido ${codigo}`

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
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl bg-tarjeta-hover px-4 py-3 text-center">
        <p className="text-sm text-texto-2">Escribe este monto exacto en tu banco</p>
        <p className="font-titulo text-3xl font-bold tabular-nums text-acento sm:text-4xl">{formatoBs(monto)}</p>
        <p className="mt-1 text-sm text-texto-2">Referencia (escríbela en el concepto): <span className="font-semibold text-texto">{codigo}</span></p>
      </div>

      <button type="button" onClick={() => setGrande(true)} aria-label="Ver el QR en grande"
        className="group relative w-full max-w-sm rounded-2xl border border-borde bg-white p-2 shadow-tarjeta transition hover:border-acento sm:max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen estática o externa del QR del negocio */}
        <img src={QR_TIENDA} alt={alt} width={990} height={1561} className="h-auto w-full rounded-xl" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-sm font-semibold text-white">
          <LuMaximize2 className="h-4 w-4" aria-hidden="true" /> Ver en grande
        </span>
      </button>

      <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={QR_TIENDA} download={`QR-AML-AgroTech-${codigo}.jpg`} target="_blank" rel="noopener noreferrer" className={claseBoton('secundario')}>
          <LuDownload className="h-4 w-4" aria-hidden="true" /> Guardar QR
        </a>
        <button type="button" onClick={() => void copiarMonto()} className={claseBoton('secundario')}>
          {copiado
            ? <><LuCheck className="h-4 w-4" aria-hidden="true" /> Monto copiado</>
            : <><LuCopy className="h-4 w-4" aria-hidden="true" /> Copiar monto</>}
        </button>
      </div>

      <ol className="w-full max-w-md list-decimal space-y-1 pl-5 text-sm text-texto">
        <li>Abre la app de tu banco y elige pagar con QR.</li>
        <li>Escanea el QR o súbelo desde tu galería con «Guardar QR».</li>
        <li>Escribe {formatoBs(monto)} y el código {codigo} en el concepto, paga y saca una captura del pago.</li>
      </ol>

      {grande && <QrPantallaCompleta alt={alt} onCerrar={cerrarGrande} />}
    </div>
  )
}
