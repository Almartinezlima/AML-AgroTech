import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/anular-prueba — Solo admin y solo órdenes de proveedores @amlagrotech.test.
// Limpieza de las E2E: si se recibió, saca el stock y restaura el costo; cancela la orden (0015).
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const data = await llamarFuncionOrden(supabase, 'anular_orden_compra_prueba', { p_orden_id: id })
  return respuestaOk(data)
})
