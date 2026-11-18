import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/entregas/:id/liberar — Solo admin. Si el repartidor que aceptó no aparece, la entrega
// vuelve a estar disponible y se publica otra vez en el grupo de Telegram. 409 si ya salió.
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('liberar_entrega', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk(data)
})
