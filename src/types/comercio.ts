// Tipos escritos a mano según las migraciones 0003, 0006, 0007, 0008, 0017 y 0018.
import type { CodigoEntrega, DatosCierre } from './entrega'

export const ESTADOS_PEDIDO = ['pendiente', 'confirmado', 'preparando', 'empacado', 'listo_para_recoger', 'despachado', 'entregado', 'completado', 'cancelado'] as const
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number]

export const ESTADOS_PAGO = ['pendiente', 'en_revision', 'verificado', 'rechazado', 'reembolso_pendiente', 'reembolsado'] as const
export type EstadoPago = (typeof ESTADOS_PAGO)[number]

// Desde la 9F (0020) solo se crean pedidos con QR; los otros quedan en pedidos viejos
export const METODOS_PAGO = ['qr', 'transferencia', 'contra_entrega'] as const
export type MetodoPago = (typeof METODOS_PAGO)[number]

export const TIPOS_ZONA = ['recojo', 'urbano', 'provincia'] as const
export type TipoZona = (typeof TIPOS_ZONA)[number]

export const BANDAS_TOXICOLOGICAS = ['roja', 'amarilla', 'azul', 'verde'] as const
export type BandaToxicologica = (typeof BANDAS_TOXICOLOGICAS)[number]

export const TENDENCIAS_PRECIO = ['al_alza', 'estable', 'a_la_baja'] as const
export type TendenciaPrecio = (typeof TENDENCIAS_PRECIO)[number]

export type EstadoEnvio = 'por_despachar' | 'listo_para_recoger' | 'en_camino' | 'entregado'
export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste' | 'devolucion'

export interface Categoria {
  id: string
  nombre: string
  icono: string
  descripcion: string | null
}

export interface Producto {
  id: string
  sku: string | null
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  stock_minimo: number
  unidad: string
  categoria_id: string | null
  icono: string | null
  imagen_url: string | null
  activo: boolean
  // Ficha técnica (migración 0008): todo opcional
  composicion: string | null
  cultivos: string | null
  modo_uso: string | null
  dosis: string | null
  banda_toxicologica: BandaToxicologica | null
  // Precio de referencia de mercado (no es nuestro precio)
  precio_referencia: number | null
  fuente_precio: string | null
  fecha_precio: string | null
  tendencia_precio: TendenciaPrecio | null
  categorias: { nombre: string; icono: string } | null
}

export interface ZonaEnvio {
  id: string
  nombre: string
  tipo: TipoZona
  costo: number
  dias_min: number
  dias_max: number
  permite_contra_entrega: boolean
  activo: boolean
  orden: number
}

export interface ItemPedido {
  id: string
  producto_id: string | null
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface PagoPedido {
  id: string
  metodo: MetodoPago
  monto: number
  estado: EstadoPago
  motivo_rechazo: string | null
  comprobante_path: string | null
  revisado_en: string | null
}

export interface EnvioPedido {
  id: string
  estado: EstadoEnvio
  transportista: string | null
  numero_guia: string | null
  despachado_en: string | null
  entregado_en: string | null
}

export interface EventoSeguimiento {
  id: string
  estado: EstadoPedido
  nota: string | null
  created_at: string
  // Quién hizo el paso (linea_tiempo_pedido, migración 0017). Sin la 0017 no vienen.
  actor_nombre?: string | null
  actor_rol?: string | null
  es_propio?: boolean
}

// Faltante reportado por el almacén (migración 0017). El admin lo ve en el detalle del pedido.
export interface FaltantePedido {
  id: string
  pedido_item_id: string | null
  producto: string | null
  nota: string
  reportado_por: string | null
  created_at: string
  resuelto_en: string | null
  resuelto_por: string | null
  nota_resolucion: string | null
}

export interface ClientePedido {
  nombre: string
  telefono: string | null
  email: string
}

export interface PedidoResumen {
  id: string
  codigo: string
  usuario_id: string
  estado: EstadoPedido
  estado_pago: EstadoPago
  metodo_pago: MetodoPago
  total: number
  created_at: string
  direccion_entrega: string | null
  telefono_contacto: string | null
  // Zonas por flota: quién recoge la encomienda
  recoge_nombre: string | null
  recoge_ci: string | null
  zonas_envio: { nombre: string; tipo: TipoZona } | null
  envios: { estado: EstadoEnvio; transportista: string | null; numero_guia: string | null } | null
  pagos: { estado: EstadoPago } | null
  cliente?: ClientePedido | null
  // Solo para el dueño, con el pedido en camino (migración 0018)
  codigo_entrega?: CodigoEntrega | null
}

export interface PedidoDetalle extends Omit<PedidoResumen, 'pagos' | 'envios'> {
  subtotal: number
  costo_envio: number
  notas: string | null
  pedido_items: ItemPedido[]
  pagos: PagoPedido | null
  envios: EnvioPedido | null
  seguimiento_pedido: EventoSeguimiento[]
  comprobante_url: string | null
  cliente?: ClientePedido | null
  // Solo para el admin (migración 0017)
  faltantes?: FaltantePedido[]
  // Quién recibió, cobro en efectivo, cierre y calificación (migración 0018)
  cierre?: DatosCierre | null
}

export interface PagoAdmin {
  id: string
  pedido_id: string
  metodo: MetodoPago
  monto: number
  estado: EstadoPago
  motivo_rechazo: string | null
  comprobante_path: string | null
  created_at: string
  comprobante_url: string | null
  pedidos: { codigo: string; estado: EstadoPedido; usuario_id: string; total?: number } | null
  cliente?: ClientePedido | null
}

export interface Movimiento {
  id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  pedido_id: string | null
  usuario_id: string | null
  created_at: string
  productos: { nombre: string; sku: string | null } | null
  usuario?: string | null
}

export interface Cotizacion {
  subtotal: number
  costo_envio: number
  total: number
  items: Array<{ producto_id: string; nombre: string; precio: number; cantidad: number; subtotal: number }>
}

// Datos de entrega del último pedido, para rellenar el checkout (GET /api/pedidos/ultima-entrega)
export interface UltimaEntrega {
  zona_id: string | null
  direccion: string | null
  telefono: string | null
  recoge_nombre: string | null
  recoge_ci: string | null
}

export interface PedidoCreado {
  id: string
  codigo: string
  total: number
}

export interface Dashboard {
  ventas_hoy: { total: number; pedidos: number }
  ventas_mes: { total: number; pedidos: number }
  ventas_7_dias: Array<{ fecha: string; total: number }>
  pedidos_por_estado: Array<{ estado: EstadoPedido; total: number }>
  top_productos: Array<{ nombre: string; cantidad: number; ingresos: number }>
  stock_bajo: Array<{ id: string; nombre: string; stock: number; stock_minimo: number; icono: string | null }>
  total_stock_bajo: number
  pagos_en_revision: number
  // Desde la 0006; puede faltar si la migración todavía no se corrió
  reembolsos_pendientes?: { pagos: number; total: number }
  cobrado: number
  por_cobrar: number
  valor_inventario: number
}
