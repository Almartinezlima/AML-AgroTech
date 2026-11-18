// Entrega y cierre del pedido (fase 9D, 0018; repartidores externos 9F, 0020). Lo devuelven las
// funciones de la base: el repartidor no lee tablas directo y nadie (salvo el dueño) recibe el código.
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

// Panel del repartidor externo (panel_repartidor, migración 0020)
// Disponibles: sin nombre ni teléfono del cliente hasta que la acepta.
export interface EntregaDisponible {
  id: string
  codigo: string
  zona: string | null
  direccion_entrega: string | null
  bultos: number | null
  ganas: number
  empacado_en: string | null
}

// Las que aceptó: listas para recoger en la tienda (empacado) o en camino (despachado)
export interface EntregaMia extends EntregaDisponible {
  estado: EstadoPedido
  cliente: string | null
  telefono: string | null
  notas: string | null
  aceptado_en: string
  despachado_en: string | null
  codigo_bloqueado: boolean
}

export interface PanelRepartidor {
  disponible: boolean
  disponibles: EntregaDisponible[]
  mias: EntregaMia[]
  ganado: number
  por_cobrar: number
  entregas_hechas: number
  ultimo_pago: { monto: number; entregas: number; pagado_en: string } | null
}

// Cola del admin (cola_reparto): a domicilio listos para salir o en camino
export interface PedidoReparto {
  id: string
  codigo: string
  estado: EstadoPedido
  total: number
  created_at: string
  cliente: string | null
  telefono: string | null
  zona: string | null
  direccion_entrega: string | null
  notas: string | null
  bultos: number | null
  ganas: number
  empacado_en: string | null
  repartidor: string | null
  aceptado_en: string | null
  despachado_en: string | null
  codigo_bloqueado: boolean
}

// /admin/repartidores (deudas_repartidores)
export interface DeudaRepartidor {
  id: string
  nombre: string
  telefono: string | null
  activo: boolean
  es_repartidor: boolean
  disponible: boolean
  en_curso: number
  entregas_por_pagar: number
  por_pagar: number
  total_pagado: number
  ultimo_pago_en: string | null
}

export interface PagoRepartidor {
  id: string
  repartidor: string | null
  monto: number
  entregas: number
  pagado_por: string | null
  pagado_en: string
}

export interface DeudasRepartidores {
  repartidores: DeudaRepartidor[]
  pagos: PagoRepartidor[]
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
  ganas: number
  empacado_en: string | null
  repartidor: string | null
  es_mia: boolean
  aceptado_en: string | null
  despachado_por: string | null
  despachado_en: string | null
  entregado_por: string | null
  entregado_en: string | null
  recibe_nombre: string | null
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
