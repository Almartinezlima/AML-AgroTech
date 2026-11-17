import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaCalificar } from '@/lib/entrega/esquemas'

// POST /api/pedidos/:id/calificacion — "Recibí conforme": el dueño califica la entrega
// (1 a 5 estrellas y comentario corto), una sola vez. 409 si ya calificó.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirSesion()
  const id = validarUuid(params.id)
  const { estrellas, comentario } = await validarCuerpo(request, esquemaCalificar)

  const { data, error } = await supabase.rpc('calificar_entrega', {
    p_pedido_id: id,
    p_estrellas: estrellas,
    p_comentario: comentario || null,
  })
  if (error) throw error

  return respuestaOk(data, 201)
})
