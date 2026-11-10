import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaCancelar } from '@/lib/ecommerce/esquemas'

// POST /api/pedidos/:id/cancelar — Dueño si está pendiente; admin si pendiente o confirmado.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirSesion()
  const id = validarUuid(params.id)
  const { motivo } = await validarCuerpo(request, esquemaCancelar)

  const { data, error } = await supabase.rpc('cancelar_pedido', {
    p_pedido_id: id,
    p_motivo: motivo ?? null,
  })

  if (error) throw error

  return respuestaOk(data)
})
