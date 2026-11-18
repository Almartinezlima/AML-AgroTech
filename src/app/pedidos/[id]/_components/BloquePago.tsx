'use client'
import { LuExternalLink } from 'react-icons/lu'
import QrPago from '@/components/pagos/QrPago'
import { Aviso } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseTarjeta } from '@/components/ui/estilos'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoDetalle } from '@/types/comercio'
import SubirComprobante from '@/components/pagos/SubirComprobante'

interface BloquePagoProps {
  pedido: PedidoDetalle
  esDueno: boolean
  onActualizado: () => void
}

export default function BloquePago({ pedido, esDueno, onActualizado }: BloquePagoProps) {
  const pago = pedido.pagos
  if (!pago) return null

  const puedeSubir = esDueno
    && pedido.estado !== 'cancelado'
    && pago.metodo === 'qr'
    && (pago.estado === 'pendiente' || pago.estado === 'rechazado')

  return (
    <section className={`${claseTarjeta} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-titulo text-lg font-bold text-texto">Pago · {ETIQUETA_METODO[pago.metodo]}</h2>
        <Insignia info={INFO_ESTADO_PAGO[pago.estado]} />
      </div>

      {pago.estado === 'rechazado' && pago.motivo_rechazo && (
        <Aviso tipo="error">La tienda rechazó tu comprobante (foto del pago). Motivo: {pago.motivo_rechazo}. Sube otra foto aquí abajo.</Aviso>
      )}

      {pago.estado === 'reembolso_pendiente' && (
        <Aviso tipo="advertencia">
          El pedido se canceló después de tu pago. La tienda te devolverá {formatoBs(pago.monto)}. Mira aquí cuando esté hecho.
        </Aviso>
      )}
      {pago.estado === 'reembolsado' && (
        <Aviso tipo="ok">La tienda ya te devolvió {formatoBs(pago.monto)}.</Aviso>
      )}

      {pago.estado === 'en_revision' && esDueno && (
        <Aviso tipo="ok">Recibimos tu comprobante (foto del pago). La tienda lo está revisando; mira aquí el estado.</Aviso>
      )}

      {puedeSubir && <QrPago monto={pago.monto} codigo={pedido.codigo} />}

      {pedido.comprobante_url && (
        <a href={pedido.comprobante_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:underline">
          Ver comprobante (foto del pago) <LuExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}

      {puedeSubir && <SubirComprobante pedidoId={pedido.id} onEnviado={onActualizado} />}
    </section>
  )
}
