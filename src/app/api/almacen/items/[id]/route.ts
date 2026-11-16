import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaMarcarItem } from '@/lib/almacen/esquemas'

// PATCH /api/almacen/items/:id — Almacén o admin. Marca (o desmarca) un producto como puesto en la caja.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirRol(['almacen'])
  const id = validarUuid(params.id)
  const { marcado } = await validarCuerpo(request, esquemaMarcarItem)

  const { data, error } = await supabase.rpc('marcar_item_pedido', { p_item_id: id, p_marcado: marcado })
  if (error) throw error

  return respuestaOk(data)
})
