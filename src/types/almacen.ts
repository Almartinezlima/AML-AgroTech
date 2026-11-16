// Panel de almacén (fase 9C, migración 0017). Lo devuelven las funciones cola_almacen y
// detalle_preparacion: el almacén no lee las tablas directamente.
import type { EstadoPedido, FaltantePedido, MetodoPago, TipoZona } from './comercio'

export interface PedidoCola {
  id: string
  codigo: string
  estado: EstadoPedido
  metodo_pago: MetodoPago
  created_at: string
  cliente: string | null
  zona: string | null
  tipo_zona: TipoZona | null
  productos: number
  marcados: number
  faltantes_abiertos: number
  preparacion_por: string | null
  empacado_en: string | null
  bultos: number | null
}

export interface ItemPreparacion {
  id: string
  nombre_producto: string
  cantidad: number
  unidad: string | null
  sku: string | null
  marcado: boolean
  marcado_por: string | null
  marcado_en: string | null
}

export interface DetallePreparacion {
  id: string
  codigo: string
  estado: EstadoPedido
  metodo_pago: MetodoPago
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
  preparacion_por: string | null
  preparacion_en: string | null
  empacado_por: string | null
  empacado_en: string | null
  items: ItemPreparacion[]
  faltantes: FaltantePedido[]
}
