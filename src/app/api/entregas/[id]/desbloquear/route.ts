import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaDesbloquear } from '@/lib/entrega/esquemas'

// POST /api/entregas/:id/desbloquear — Solo admin, con nota. Vuelve a habilitar el código
// de entrega bloqueado por 5 intentos fallidos. Queda en la línea de tiempo.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { nota } = await validarCuerpo(request, esquemaDesbloquear)

  const { data, error } = await supabase.rpc('desbloquear_codigo_entrega', { p_pedido_id: id, p_nota: nota })
  if (error) throw error

  return respuestaOk(data)
})
