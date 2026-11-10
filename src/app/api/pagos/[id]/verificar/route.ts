import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaVerificarPago } from '@/lib/ecommerce/esquemas'

// PATCH /api/pagos/:id/verificar — Solo admin.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { aprobado, motivo } = await validarCuerpo(request, esquemaVerificarPago)

  const { data, error } = await supabase.rpc('verificar_pago', {
    p_pago_id: id,
    p_aprobado: aprobado,
    p_motivo: motivo ?? null,
  })

  if (error) throw error

  return respuestaOk(data)
})
