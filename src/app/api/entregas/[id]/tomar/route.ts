import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/entregas/:id/tomar — "Recogí el pedido" en la tienda. Solo quien aceptó la entrega
// (o el admin, si la lleva él). Listo para salir → en camino, con quién y cuándo.
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirRol(['repartidor'])
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('tomar_pedido', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk(data)
})
