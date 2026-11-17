// Entrega y cierre del pedido (fase 9D, migración 0018). Lo devuelven las funciones de la base:
// el repartidor no lee tablas directo y nadie (salvo el dueño) recibe el código de entrega.
import type { EstadoPago, EstadoPedido, MetodoPago, TipoZona } from './comercio'

// Solo para el dueño del pedido (mi_codigo_entrega). Bloqueado: el código no viene.
export interface CodigoEntrega {
  pedido_id: string
  codigo: string | null
  bloqueado: boolean
}

// Datos de cierre que se leen aparte (columnas de la 0018)
export interface DatosCierre {
  entregado_en: string | null
  recibe_nombre: string | null
  recibe_ci: string | null
  completado_en: string | null
  conforme_en: string | null
  cobrado_en: string | null
  monto_cobrado: number | null
  calificacion: CalificacionEntrega | null
}

export interface CalificacionEntrega {
  estrellas: number
  comentario: string | null
  created_at: string
}

// Cola del repartidor (cola_reparto)
export interface PedidoReparto {
  id: string
  codigo: string
  estado: EstadoPedido
  metodo_pago: MetodoPago
  total: number
  created_at: string
  cliente: string | null
  telefono: string | null
  zona: string | null
  direccion_entrega: string | null
  notas: string | null
  bultos: number | null
  empacado_en: string | null
  despachado_por: string | null
  despachado_en: string | null
  es_mio: boolean
  cobrado: boolean
  codigo_bloqueado: boolean
}

// Para entregar (detalle_entrega): nunca trae el código
export interface DetalleEntrega {
  id: string
  codigo: string
  estado: EstadoPedido
  metodo_pago: MetodoPago
  estado_pago: EstadoPago
  total: number
  created_at: string
  cliente: string | null
  telefono: string | null
  zona: string | null
  tipo_zona: TipoZona | null
  direccion_entrega: string | null
  recoge_nombre: string | null
  recoge_ci: string | null
  notas: string | null
  bultos: number | null
  empacado_en: string | null
  despachado_por: string | null
  despachado_en: string | null
  entregado_por: string | null
  entregado_en: string | null
  recibe_nombre: string | null
  cobrado: boolean
  cobrado_por: string | null
  cobrado_en: string | null
  tiene_codigo: boolean
  codigo_bloqueado: boolean
  intentos_restantes: number | null
  items: Array<{ id: string; nombre_producto: string; cantidad: number; unidad: string | null }>
}

// Respuesta de entregar_pedido. Con código incorrecto no es un error de la base: se cuenta el intento.
export interface ResultadoEntrega {
  ok: boolean
  estado?: EstadoPedido
  bloqueado?: boolean
  intentos_restantes?: number
}

// Panel del admin (GET /api/calificaciones)
export interface CalificacionAdmin extends CalificacionEntrega {
  id: string
  pedido_id: string
  codigo: string | null
  cliente: string | null
}

export interface ResumenCalificaciones {
  total: number
  promedio: number | null
  bajas: number
  ultimas: CalificacionAdmin[]
}
