import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRepartidor } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/entregas/:id/aceptar — Solo repartidor disponible. El primero se la lleva (la base
// bloquea la fila); al segundo le responde 409 "Otro repartidor ya la tomó."
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirRepartidor()
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('aceptar_entrega', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk(data)
})
