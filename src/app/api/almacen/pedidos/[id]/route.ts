import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import type { DetallePreparacion } from '@/types/almacen'

export const dynamic = 'force-dynamic'

// GET /api/almacen/pedidos/:id — Almacén o admin. Productos con sus casillas, faltantes y datos de la etiqueta.
export const GET = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirRol(['almacen'])
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('detalle_preparacion', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk<DetallePreparacion>(data as DetallePreparacion)
})
