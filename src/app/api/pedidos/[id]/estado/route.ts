import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaEstadoPedido } from '@/lib/ecommerce/esquemas'

// PATCH /api/pedidos/:id/estado — Solo admin. Las transiciones las valida la base.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cambio = await validarCuerpo(request, esquemaEstadoPedido)

  const { data, error } = await supabase.rpc('cambiar_estado_pedido', {
    p_pedido_id: id,
    p_estado: cambio.estado,
    p_nota: cambio.nota ?? null,
    p_transportista: cambio.transportista ?? null,
    p_numero_guia: cambio.numero_guia ?? null,
  })

  if (error) throw error

  return respuestaOk(data)
})
