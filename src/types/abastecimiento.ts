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
