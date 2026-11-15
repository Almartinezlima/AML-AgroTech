import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaMotivoCancelacion } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/cancelar — Solo admin, con motivo. Solo en borrador, enviada o aceptada.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cuerpo = await validarCuerpo(request, esquemaMotivoCancelacion)

  const data = await llamarFuncionOrden(supabase, 'cancelar_orden_compra', { p_orden_id: id, p_motivo: cuerpo.motivo })
  return respuestaOk(data)
})
