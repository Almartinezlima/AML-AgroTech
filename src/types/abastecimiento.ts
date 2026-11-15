// Tipos escritos a mano según la migración 0013 (proveedores y presentaciones).

export const CIUDADES_DISTRIBUIDOR = ['Sucre', 'Santa Cruz'] as const
export type CiudadDistribuidor = (typeof CIUDADES_DISTRIBUIDOR)[number]

// Ficha del proveedor mayorista
export interface Distribuidor {
  id: string
  usuario_id: string
  nombre_comercial: string
  ciudad: CiudadDistribuidor
  telefono: string | null
  nit: string | null
  dias_entrega: number
  activo: boolean
  created_at: string
}

// Lo justo del producto de la tienda para mostrar al lado de una presentación
export interface ProductoDePresentacion {
  nombre: string
  sku: string | null
  unidad: string
  precio: number
}

export interface Presentacion {
  id: string
  distribuidor_id: string
  producto_id: string
  nombre: string
  unidades_por_presentacion: number
  precio_mayorista: number
  disponible: boolean
  dias_entrega: number | null
  activo: boolean
  updated_at: string
  productos: ProductoDePresentacion | null
}

// Vista del admin: la ficha con su cuenta y lo que vende
export interface DistribuidorAdmin extends Distribuidor {
  cuenta: { nombre: string; email: string; activo: boolean } | null
  es_prueba: boolean
  presentaciones: Presentacion[]
}

// Cuenta con rol distribuidor que todavía no tiene ficha
export interface CuentaSinFicha {
  id: string
  nombre: string
  email: string
}

export interface ResumenDistribuidoresAdmin {
  distribuidores: DistribuidorAdmin[]
  cuentas_sin_ficha: CuentaSinFicha[]
}

// ───── Órdenes de compra (migración 0015) ─────

export const ESTADOS_ORDEN_COMPRA = ['borrador', 'enviada', 'aceptada', 'despachada', 'recibida', 'rechazada', 'cancelada'] as const
export type EstadoOrdenCompra = (typeof ESTADOS_ORDEN_COMPRA)[number]

// Una línea de la orden. Mientras es borrador, nombre/unidades/precio salen de la
// presentación vigente; desde que se envía, de la copia guardada en la línea.
export interface LineaOrdenCompra {
  id: string
  presentacion_id: string
  producto_id: string
  cantidad: number
  nombre_presentacion: string | null
  unidades_por_presentacion: number | null
  precio_unitario: number | null
  cantidad_recibida: number | null
  faltante: number | null
  producto: { nombre: string; sku: string | null; unidad: string } | null
  presentacion: { nombre: string; unidades_por_presentacion: number; precio_mayorista: number; activo: boolean; disponible: boolean } | null
}

// Solo el admin: stock y costo del producto para la recepción
export interface LineaOrdenAdmin extends LineaOrdenCompra {
  stock: number
  costo_promedio: number | null
}

export interface EventoOrdenCompra {
  id: string
  estado: EstadoOrdenCompra
  nota: string | null
  created_at: string
}

export interface OrdenCompra {
  id: string
  codigo: string
  distribuidor_id: string
  estado: EstadoOrdenCompra
  total: number
  total_recibido: number | null
  fecha_estimada: string | null
  transportista: string | null
  guia: string | null
  motivo: string | null
  nota_recepcion: string | null
  created_at: string
  enviada_en: string | null
  aceptada_en: string | null
  despachada_en: string | null
  recibida_en: string | null
  distribuidor: { nombre_comercial: string; ciudad: CiudadDistribuidor; telefono: string | null } | null
}

export interface OrdenCompraResumen extends OrdenCompra {
  cantidad_lineas: number
  es_prueba?: boolean
}

export interface OrdenCompraDetalle<L extends LineaOrdenCompra = LineaOrdenCompra> extends OrdenCompra {
  lineas: L[]
  seguimiento: EventoOrdenCompra[]
}

// Lo que ve el admin: además, las presentaciones que puede sumar al borrador
export interface OrdenCompraAdmin extends OrdenCompraDetalle<LineaOrdenAdmin> {
  es_prueba: boolean
  presentaciones_disponibles: Presentacion[]
}

// ───── Reposición ─────

export interface OpcionReponer {
  presentacion_id: string
  distribuidor_id: string
  distribuidor: string
  ciudad: CiudadDistribuidor
  nombre: string
  unidades_por_presentacion: number
  precio_mayorista: number
  costo_por_unidad: number
  es_prueba: boolean
}

export interface ProductoReponer {
  id: string
  nombre: string
  sku: string | null
  unidad: string
  stock: number
  stock_minimo: number
  // stock ≤ 1,5 × mínimo
  para_reponer: boolean
  // Del más barato por unidad al más caro
  opciones: OpcionReponer[]
}

// ───── Margen ─────

export type TipoCosto = 'real' | 'estimado' | 'sin_costo'

export interface MargenProducto {
  id: string
  nombre: string
  sku: string | null
  unidad: string
  precio: number
  costo: number | null
  tipo_costo: TipoCosto
  costo_ultimo: number | null
  margen_bs: number | null
  margen_pct: number | null
}

export interface ResumenMargen {
  productos: MargenProducto[]
  margen_promedio: number | null
  con_costo: number
  estimados: number
  sin_costo: number
  menores: MargenProducto[]
}
