import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaRecibido } from '@/lib/entrega/esquemas'

// POST /api/pedidos/:id/recibido — Por flota: el dueño confirma "Recibí mi pedido", o el admin
// con una nota obligatoria. Con el pago verificado, el pedido queda completado.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirSesion()
  const id = validarUuid(params.id)
  const { nota } = await validarCuerpo(request, esquemaRecibido)

  const { data, error } = await supabase.rpc('confirmar_recepcion', { p_pedido_id: id, p_nota: nota || null })
  if (error) throw error

  return respuestaOk(data)
})
