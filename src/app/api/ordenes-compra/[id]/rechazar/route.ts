import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaMotivoRechazo } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/rechazar — Solo el proveedor dueño, con motivo (orden enviada o aceptada).
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirDistribuidor()
  const id = validarUuid(params.id)
  const cuerpo = await validarCuerpo(request, esquemaMotivoRechazo)

  const data = await llamarFuncionOrden(supabase, 'rechazar_orden_compra', { p_orden_id: id, p_motivo: cuerpo.motivo })
  return respuestaOk(data)
})
