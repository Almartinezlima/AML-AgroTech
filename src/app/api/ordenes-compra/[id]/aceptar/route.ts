import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaAceptarOrden } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/aceptar — Solo el proveedor dueño de la orden, con la fecha estimada de entrega.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirDistribuidor()
  const id = validarUuid(params.id)
  const cuerpo = await validarCuerpo(request, esquemaAceptarOrden)

  const data = await llamarFuncionOrden(supabase, 'aceptar_orden_compra', { p_orden_id: id, p_fecha_estimada: cuerpo.fecha_estimada })
  return respuestaOk(data)
})
