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
