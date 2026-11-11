import type { EstadoEnvio, EstadoPago, EstadoPedido, MetodoPago, TipoMovimiento, TipoZona, ZonaEnvio } from '@/types/comercio'

// Los colores de estado son los definidos en CLAUDE.md
const AMBAR = '#f59e0b'
const VERDE = '#22c55e'
const AZUL = '#3b82f6'
const ROJO = '#ef4444'

export const INFO_ESTADO_PEDIDO: Record<EstadoPedido, { etiqueta: string; color: string }> = {
  pendiente: { etiqueta: 'Pendiente', color: AMBAR },
  confirmado: { etiqueta: 'Confirmado', color: VERDE },
  preparando: { etiqueta: 'Preparando', color: AZUL },
  listo_para_recoger: { etiqueta: 'Listo para recoger', color: AZUL },
  despachado: { etiqueta: 'Despachado', color: AZUL },
  entregado: { etiqueta: 'Entregado', color: VERDE },
  cancelado: { etiqueta: 'Cancelado', color: ROJO },
}

export const INFO_ESTADO_PAGO: Record<EstadoPago, { etiqueta: string; color: string }> = {
  pendiente: { etiqueta: 'Pago pendiente', color: AMBAR },
  en_revision: { etiqueta: 'En revisión', color: AZUL },
  verificado: { etiqueta: 'Pago verificado', color: VERDE },
  rechazado: { etiqueta: 'Pago rechazado', color: ROJO },
  reembolso_pendiente: { etiqueta: 'Reembolso pendiente', color: AMBAR },
  reembolsado: { etiqueta: 'Reembolsado', color: VERDE },
}

export const INFO_ESTADO_ENVIO: Record<EstadoEnvio, { etiqueta: string; color: string }> = {
  por_despachar: { etiqueta: 'Por despachar', color: AMBAR },
  listo_para_recoger: { etiqueta: 'Listo para recoger', color: AZUL },
  en_camino: { etiqueta: 'En camino', color: AZUL },
  entregado: { etiqueta: 'Entregado', color: VERDE },
}

export const INFO_MOVIMIENTO: Record<TipoMovimiento, { etiqueta: string; color: string }> = {
  entrada: { etiqueta: 'Entrada', color: VERDE },
  salida: { etiqueta: 'Salida', color: AZUL },
  ajuste: { etiqueta: 'Ajuste', color: AMBAR },
  devolucion: { etiqueta: 'Devolución', color: VERDE },
}

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  qr: 'QR',
  transferencia: 'Transferencia',
  contra_entrega: 'Contra entrega',
}

// En palabras simples para el cliente (los valores de la base siguen siendo recojo/urbano/provincia)
export const ETIQUETA_TIPO_ZONA: Record<TipoZona, string> = {
  recojo: 'Recojo',
  urbano: 'En el pueblo',
  provincia: 'Por flota',
}

const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  pendiente: 'confirmado',
  confirmado: 'preparando',
  preparando: 'despachado',
  despachado: 'entregado',
}

// Recojo en tienda no pasa por "despachado": se prepara y queda listo para recoger (migración 0007)
const SIGUIENTE_RECOJO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  pendiente: 'confirmado',
  confirmado: 'preparando',
  preparando: 'listo_para_recoger',
  listo_para_recoger: 'entregado',
}

export const siguienteEstado = (estado: EstadoPedido, tipoZona?: TipoZona | null) =>
  (tipoZona === 'recojo' ? SIGUIENTE_RECOJO : SIGUIENTE)[estado] ?? null

// Estados en que el pago ya llegó o está por revisarse: el cliente no puede cancelar solo (0006)
export const puedeCancelarCliente = (estado: EstadoPedido, estadoPago: EstadoPago) =>
  estado === 'pendiente' && estadoPago === 'pendiente'

export function tiempoEntrega(zona: Pick<ZonaEnvio, 'dias_min' | 'dias_max'>) {
  if (zona.dias_max === 0) return 'Mismo día'
  if (zona.dias_min === zona.dias_max) return `${zona.dias_max} día${zona.dias_max === 1 ? '' : 's'}`
  return `${zona.dias_min}–${zona.dias_max} días`
}

export type NivelStock = 'agotado' | 'bajo' | 'normal'

export const INFO_NIVEL: Record<NivelStock, { etiqueta: string; color: string }> = {
  agotado: { etiqueta: 'Agotado', color: ROJO },
  bajo: { etiqueta: 'Bajo', color: AMBAR },
  normal: { etiqueta: 'Normal', color: VERDE },
}

export function nivelStock(stock: number, minimo: number): NivelStock {
  if (stock === 0) return 'agotado'
  return stock <= minimo ? 'bajo' : 'normal'
}

// Siempre en hora de Bolivia, sin importar dónde corra
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const fechaHora = (fecha: string) => FORMATO_FECHA_HORA.format(new Date(fecha))
