import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/almacen/pedidos/:id/preparar — Solo admin (fase 9F: ya no hay rol almacén). confirmado → preparando (registra quién).
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('empezar_preparacion', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk(data)
})
