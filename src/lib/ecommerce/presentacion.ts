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
  empacado: { etiqueta: 'Empacado', color: AZUL },
  listo_para_recoger: { etiqueta: 'Listo para recoger', color: AZUL },
  despachado: { etiqueta: 'Despachado', color: AZUL },
  entregado: { etiqueta: 'Entregado', color: VERDE },
  completado: { etiqueta: 'Completado', color: VERDE },
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

// ───── Estado para el cliente (fase 4) ─────
// Una sola insignia con nombre corto y una línea de "qué sigue". El panel admin usa los mapas de arriba.
// Ningún texto promete avisos automáticos: la tienda no los envía.
export interface EstadoCliente {
  etiqueta: string
  color: string
  queSigue: string
}

interface DatosEstadoCliente {
  estado: EstadoPedido
  estado_pago: EstadoPago
  metodo_pago: MetodoPago
  tipoZona?: TipoZona | null
  monto?: number
}

const bs = (monto?: number) =>
  monto === undefined ? 'tu dinero' : `Bs. ${monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function estadoCliente({ estado, estado_pago, metodo_pago, tipoZona, monto }: DatosEstadoCliente): EstadoCliente {
  switch (estado) {
    case 'pendiente':
      if (estado_pago === 'en_revision') {
        return { etiqueta: 'Revisando tu pago', color: AZUL, queSigue: 'La tienda está revisando tu comprobante. Mira aquí el estado.' }
      }
      if (estado_pago === 'rechazado') {
        return { etiqueta: 'Pago rechazado', color: ROJO, queSigue: 'La tienda no pudo validar tu comprobante. Sube otro comprobante.' }
      }
      if (metodo_pago === 'contra_entrega') {
        return { etiqueta: 'Recibido', color: AMBAR, queSigue: 'La tienda revisará tu pedido para confirmarlo. Pagas en efectivo al recibirlo.' }
      }
      return { etiqueta: 'Falta pagar', color: AMBAR, queSigue: `Paga con ${metodo_pago === 'qr' ? 'el QR' : 'transferencia'} y sube la foto de tu comprobante.` }
    case 'confirmado':
      return { etiqueta: 'Confirmado', color: VERDE, queSigue: 'Tu pedido está confirmado. El siguiente paso es prepararlo.' }
    case 'preparando':
      return { etiqueta: 'Preparando', color: AZUL, queSigue: 'Estamos alistando tus productos.' }
    case 'empacado':
      return {
        etiqueta: 'Empacado',
        color: AZUL,
        queSigue: tipoZona === 'provincia'
          ? 'Tu pedido está empacado y sale pronto en la flota.'
          : 'Tu pedido está empacado y sale pronto hacia ti. Ten a mano tu código de entrega.',
      }
    case 'listo_para_recoger':
      return { etiqueta: 'Listo para recoger', color: AZUL, queSigue: 'Pasa por la tienda de Villa Charcas. Da tu código de entrega cuando tengas tu pedido en la mano.' }
    case 'despachado':
      return {
        etiqueta: 'En camino',
        color: AZUL,
        queSigue: tipoZona === 'provincia'
          ? 'Va en la flota. Recógelo en la terminal con el carnet de quien indicaste y toca «Recibí mi pedido».'
          : 'Va hacia la dirección que indicaste. Da tu código de entrega solo cuando tengas tu pedido en la mano.',
      }
    case 'entregado':
      return { etiqueta: 'Entregado', color: VERDE, queSigue: '¡Gracias por tu compra! Cuéntanos cómo te fue con la entrega.' }
    case 'completado':
      return { etiqueta: 'Completado', color: VERDE, queSigue: 'Pedido cerrado: entregado y pagado. ¡Gracias por tu compra!' }
    case 'cancelado':
      if (estado_pago === 'reembolso_pendiente') {
        return { etiqueta: 'Cancelado', color: ROJO, queSigue: `La tienda te devolverá ${bs(monto)}.` }
      }
      if (estado_pago === 'reembolsado') {
        return { etiqueta: 'Cancelado', color: ROJO, queSigue: `La tienda ya te devolvió ${bs(monto)}.` }
      }
      return { etiqueta: 'Cancelado', color: ROJO, queSigue: 'Este pedido se canceló. No se te cobró nada.' }
  }
}

// Nombres de la línea de tiempo para el cliente (el admin ve los de INFO_ESTADO_PEDIDO)
export const ETIQUETA_SEGUIMIENTO_CLIENTE: Record<EstadoPedido, string> = {
  pendiente: 'Pedido recibido',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  empacado: 'Empacado',
  listo_para_recoger: 'Listo para recoger',
  despachado: 'En camino',
  entregado: 'Entregado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  qr: 'QR',
  transferencia: 'Transferencia',
  contra_entrega: 'Contra entrega',
}

// En palabras simples para el cliente (los valores de la base siguen siendo recojo/urbano/provincia)
export const ETIQUETA_TIPO_ZONA: Record<TipoZona, string> = {
  recojo: 'Recojo',
  urbano: 'A domicilio',
  provincia: 'Por flota',
}

// Pasos que el admin avanza a mano (cambiar_estado_pedido, migración 0018). Preparar y empacar
// se hacen en /almacen; a domicilio lo despacha el repartidor ("Tomar y salir") y nadie marca
// "entregado" sin prueba: código de entrega, o por flota "Recibí mi pedido" / nota de la tienda.
const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  pendiente: 'confirmado',
}

// Por flota el admin despacha con la empresa y el número de guía
const SIGUIENTE_FLOTA: Partial<Record<EstadoPedido, EstadoPedido>> = {
  pendiente: 'confirmado',
  empacado: 'despachado',
}

// Estados que se trabajan en el panel de almacén
export const ESTADOS_ALMACEN: readonly EstadoPedido[] = ['confirmado', 'preparando']

// El admin cancela hasta que el pedido sale (0017: también preparando y empacado)
export const puedeCancelarAdmin = (estado: EstadoPedido) =>
  estado === 'pendiente' || estado === 'confirmado' || estado === 'preparando' || estado === 'empacado'

export const siguienteEstado = (estado: EstadoPedido, tipoZona?: TipoZona | null) =>
  (tipoZona === 'provincia' ? SIGUIENTE_FLOTA : SIGUIENTE)[estado] ?? null

// Estados en que el pedido ya salió del almacén y espera la entrega
export const ESTADOS_EN_ENTREGA: readonly EstadoPedido[] = ['empacado', 'listo_para_recoger', 'despachado']

// Pedido cerrado o entregado: ya se puede calificar la entrega
export const estaEntregado = (estado: EstadoPedido) => estado === 'entregado' || estado === 'completado'

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

// "16/11 14:32" en hora de Bolivia (línea de tiempo y panel de almacén)
const FORMATO_DIA_HORA = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export const diaHora = (fecha: string) => FORMATO_DIA_HORA.format(new Date(fecha)).replace(',', '')
