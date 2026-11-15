import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaLineaBorrador } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// PATCH /api/ordenes-compra/:id/lineas — Solo admin y solo en borrador. Cambia o suma una
// línea; cantidad 0 la quita (queda en 0: nada se borra).
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { presentacion_id, cantidad } = await validarCuerpo(request, esquemaLineaBorrador)

  const data = await llamarFuncionOrden(supabase, 'guardar_linea_orden_compra', {
    p_orden_id: id, p_presentacion_id: presentacion_id, p_cantidad: cantidad,
  })
  return respuestaOk(data)
})
