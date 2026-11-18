import Link from 'next/link'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseEnlace, claseTarjeta, claseTextoError } from '@/components/ui/estilos'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PagoAdmin } from '@/types/comercio'
import { LuExternalLink, LuFileText, LuMaximize2 } from 'react-icons/lu'

interface TarjetaPagoProps {
  pago: PagoAdmin
  onAprobar: () => void
  onRechazar: () => void
  onReembolsar: () => void
  // Abre el visor en grande (fase 9E)
  onVerComprobante: () => void
}

// Un pago en tres partes: quién y estado · comprobante con el monto esperado · monto y acciones
export default function TarjetaPago({ pago, onAprobar, onRechazar, onReembolsar, onVerComprobante }: TarjetaPagoProps) {
  // Lo que debería decir el comprobante: el total del pedido (o el monto del pago)
  const esperado = pago.pedidos?.total ?? pago.monto
  const esPdf = pago.comprobante_path?.toLowerCase().endsWith('.pdf') ?? false

  return (
    <li className={claseTarjeta}>
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <Link href={`/pedidos/${pago.pedido_id}`} className={`${claseEnlace} font-titulo text-lg`}>{pago.pedidos?.codigo}</Link>
          <p className="text-texto font-medium break-words">{pago.cliente?.nombre ?? 'Cliente'}</p>
        </div>
        <Insignia info={INFO_ESTADO_PAGO[pago.estado]} />
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 pb-3 text-sm sm:grid-cols-2">
        <div className="flex gap-1.5"><dt className="text-texto-2">Método:</dt><dd className="text-texto">{ETIQUETA_METODO[pago.metodo]}</dd></div>
        {pago.pedidos?.estado === 'cancelado' && (
          <div className="flex gap-1.5"><dt className="text-texto-2">Pedido:</dt><dd className="text-texto">Cancelado</dd></div>
        )}
        {pago.motivo_rechazo && (
          <div className="flex gap-1.5 sm:col-span-2"><dt className="shrink-0 text-texto-2">Motivo:</dt><dd className={`${claseTextoError} min-w-0 break-words`}>{pago.motivo_rechazo}</dd></div>
        )}
      </dl>

      {/* Comprobante junto al monto esperado, para comparar de un vistazo */}
      {pago.comprobante_url && (
        <div className="grid grid-cols-1 gap-4 border-t border-borde p-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center">
          {esPdf ? (
            // Un PDF se abre en otra pestaña (el visor es para fotos)
            <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className="flex h-40 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-borde bg-white text-texto-2">
              <LuFileText className="h-10 w-10" aria-hidden="true" /> Comprobante (PDF)
            </a>
          ) : (
            <button type="button" onClick={onVerComprobante} aria-label="Ver el comprobante (foto del pago) en grande"
              className="group relative block min-w-0 overflow-hidden rounded-xl border border-borde bg-white transition hover:border-acento">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de corta duración del bucket privado */}
              <img src={pago.comprobante_url} alt={`Comprobante (foto del pago) del pedido ${pago.pedidos?.codigo ?? ''}`} className="h-56 w-full object-contain sm:h-48" loading="lazy" />
              <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-texto/70 text-white">
                <LuMaximize2 className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-texto-2">Monto esperado</p>
            <p className="font-titulo text-4xl font-bold tabular-nums text-acento sm:text-5xl">{formatoBs(esperado)}</p>
            <p className="mt-1 text-sm text-texto-2">Revisa que la foto del pago diga este monto exacto antes de aprobar.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-borde bg-tarjeta-hover/40 px-4 py-3">
        <span className="font-titulo text-xl font-bold tabular-nums text-texto">{formatoBs(pago.monto)}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {pago.comprobante_url && (esPdf ? (
            <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className={claseBoton('suave', 'chico')}>
              <LuExternalLink className="h-4 w-4" aria-hidden="true" /> Ver comprobante (PDF)
            </a>
          ) : (
            <button type="button" onClick={onVerComprobante} className={claseBoton('suave', 'chico')}>
              <LuMaximize2 className="h-4 w-4" aria-hidden="true" /> Ver comprobante (foto del pago)
            </button>
          ))}
          {pago.estado === 'reembolso_pendiente' && (
            <button onClick={onReembolsar} className={claseBoton('primario', 'chico')}>Marcar como reembolsado</button>
          )}
          {pago.estado === 'en_revision' && (
            <>
              <button onClick={onRechazar} className={claseBoton('peligro', 'chico')}>Rechazar</button>
              <button onClick={onAprobar} className={claseBoton('primario', 'chico')}>Aprobar</button>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
