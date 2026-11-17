import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/entregas/:id/tomar — "Tomar y salir". Repartidor o admin. Empacado → despachado,
// con quién y cuándo. 409 si ya salió con otro repartidor.
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirRol(['repartidor'])
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('tomar_pedido', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk(data)
})
