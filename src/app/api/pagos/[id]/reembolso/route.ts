import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaReembolso } from '@/lib/ecommerce/esquemas'

// POST /api/pagos/:id/reembolso — Solo admin. Marca como devuelto un pago en reembolso pendiente.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { nota } = await validarCuerpo(request, esquemaReembolso)

  const { data, error } = await supabase.rpc('marcar_reembolsado', {
    p_pago_id: id,
    p_nota: nota ?? null,
  })

  if (error) throw error

  return respuestaOk(data)
})
