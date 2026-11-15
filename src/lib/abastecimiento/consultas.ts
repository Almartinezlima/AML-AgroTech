import { ErrorApi } from '@/lib/api/respuestas'

export const COLUMNAS_DISTRIBUIDOR = 'id, usuario_id, nombre_comercial, ciudad, telefono, nit, dias_entrega, activo, created_at'

export const COLUMNAS_PRESENTACION =
  'id, distribuidor_id, producto_id, nombre, unidades_por_presentacion, precio_mayorista, disponible, dias_entrega, activo, updated_at, ' +
  'productos(nombre, sku, unidad, precio)'

// Un nombre repetido choca con el índice único (distribuidor, producto, nombre) de la 0013
export function presentacionDuplicada(error: unknown) {
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505') {
    return new ErrorApi(409, 'DUPLICADO', 'Ya tienes una presentación activa con ese nombre para este producto.')
  }
  return error
}

// ───── Órdenes de compra (0015) ─────
export const COLUMNAS_ORDEN =
  'id, codigo, distribuidor_id, estado, total, total_recibido, fecha_estimada, transportista, guia, motivo, nota_recepcion, ' +
  'created_at, enviada_en, aceptada_en, despachada_en, recibida_en, ' +
  'distribuidor:distribuidores(nombre_comercial, ciudad, telefono)'

export const COLUMNAS_LINEA_ORDEN =
  'id, presentacion_id, producto_id, cantidad, nombre_presentacion, unidades_por_presentacion, precio_unitario, cantidad_recibida, faltante, ' +
  'producto:productos(nombre, sku, unidad), ' +
  'presentacion:presentaciones_distribuidor(nombre, unidades_por_presentacion, precio_mayorista, activo, disponible)'

export const COLUMNAS_SEGUIMIENTO_ORDEN = 'id, estado, nota, created_at'

// Una función de la 0015 que la base todavía no conoce (PGRST202) = falta correr la migración
export function migracionPendiente(error: { code?: string } | null) {
  if (error?.code === 'PGRST202' || error?.code === '42P01' || error?.code === 'PGRST205') {
    return new ErrorApi(503, 'MIGRACION_PENDIENTE', 'Falta correr la migración 0015 en Supabase.')
  }
  return error
}
