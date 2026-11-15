import type { EstadoPedido } from '@/types/comercio'

// Regla de la nota de venta (fase 7). La usan la API y el botón, para que digan lo mismo.
// - Se descarga desde que la tienda confirmó el pedido (pago verificado, o contra entrega confirmado).
// - Pendiente: todavía no hay venta → no hay nota.
// - Cancelado: si se llegó a confirmar, la nota sale con la marca "ANULADA"; si nunca se confirmó, no hay nota.
export type SituacionNota = 'disponible' | 'anulada' | 'no_disponible'

interface DatosNota {
  estado: EstadoPedido
  seguimiento_pedido?: Array<{ estado: EstadoPedido }> | null
}

const ESTADOS_SIN_VENTA: EstadoPedido[] = ['pendiente', 'cancelado']

export function situacionNota({ estado, seguimiento_pedido }: DatosNota): SituacionNota {
  if (estado === 'pendiente') return 'no_disponible'
  if (estado !== 'cancelado') return 'disponible'
  // verificar_pago y cambiar_estado_pedido dejan "confirmado" (o más) en el seguimiento
  const seConfirmo = (seguimiento_pedido ?? []).some((evento) => !ESTADOS_SIN_VENTA.includes(evento.estado))
  return seConfirmo ? 'anulada' : 'no_disponible'
}

export const MENSAJE_NOTA_NO_DISPONIBLE =
  'La nota de venta estará disponible cuando la tienda confirme tu pedido.'

export const MENSAJE_NOTA_CANCELADO =
  'Este pedido se canceló antes de confirmarse: no tiene nota de venta.'

export const nombreArchivoNota = (codigo: string) => `Nota-${codigo}.pdf`
