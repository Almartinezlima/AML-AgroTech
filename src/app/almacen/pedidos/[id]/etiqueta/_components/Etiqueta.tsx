import Marca from '@/components/Marca'
import { ETIQUETA_TIPO_ZONA } from '@/lib/ecommerce/presentacion'
import type { DetallePreparacion } from '@/types/almacen'

interface EtiquetaProps {
  pedido: DetallePreparacion
  qr: string | null
  bulto: number
  total: number
}

// Etiqueta de 10 × 15 cm: código grande, QR, bulto N de M, cliente, teléfono y destino.
// Solo negro sobre blanco para que salga bien en cualquier impresora.
export default function Etiqueta({ pedido, qr, bulto, total }: EtiquetaProps) {
  const destino = pedido.direccion_entrega
    ?? (pedido.recoge_nombre ? `Recoge en la flota: ${pedido.recoge_nombre}${pedido.recoge_ci ? ` · CI ${pedido.recoge_ci}` : ''}` : null)

  return (
    <article
      className="flex w-full max-w-[100mm] flex-col gap-3 rounded-xl border-2 border-texto bg-white p-4 text-black print:mx-auto print:min-h-[150mm] print:break-after-page print:rounded-none"
      aria-label={`Etiqueta del bulto ${bulto} de ${total}`}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2">
        <Marca />
        <span className="text-right text-sm font-bold uppercase leading-tight">Bulto<br /><span className="font-titulo text-2xl">{bulto} de {total}</span></span>
      </div>

      <div className="flex items-center gap-3">
        {qr
          // eslint-disable-next-line @next/next/no-img-element -- QR generado en el navegador (data URL)
          ? <img src={qr} alt={`QR del pedido ${pedido.codigo}`} width={120} height={120} className="h-[30mm] w-[30mm] shrink-0" />
          : <div className="h-[30mm] w-[30mm] shrink-0 animate-pulse rounded bg-tarjeta-hover" aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase">Pedido</p>
          <p className="font-titulo text-3xl font-bold leading-none tracking-tight break-all">{pedido.codigo}</p>
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 border-t-2 border-black pt-2">
        <div>
          <dt className="text-xs font-semibold uppercase">Cliente</dt>
          <dd className="text-lg font-bold leading-tight break-words">{pedido.cliente ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase">Teléfono</dt>
          <dd className="text-lg font-bold tabular-nums">{pedido.telefono ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase">Destino</dt>
          <dd className="text-base font-bold leading-tight break-words">
            {pedido.zona ?? '—'}{pedido.tipo_zona ? ` · ${ETIQUETA_TIPO_ZONA[pedido.tipo_zona]}` : ''}
          </dd>
          {destino && <dd className="text-sm leading-snug break-words">{destino}</dd>}
        </div>
      </dl>
    </article>
  )
}
