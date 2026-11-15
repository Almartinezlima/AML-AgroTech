import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/enviar — Solo admin. Envía el borrador: copia nombre, unidades y precio de cada línea.
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const data = await llamarFuncionOrden(supabase, 'enviar_orden_compra', { p_orden_id: id })
  return respuestaOk(data)
})
