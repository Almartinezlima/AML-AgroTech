import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/pedidos/:id/anular-prueba — Solo admin y solo pedidos de cuentas @amlagrotech.test.
// Lo usan las pruebas E2E para cerrar lo que crean: cancela en cualquier estado, devuelve el
// stock (kardex "Limpieza E2E …") y cierra el pago como reembolsado (migración 0011).
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('anular_pedido_prueba', { p_pedido_id: id })

  if (error?.code === 'PGRST202') {
    throw new ErrorApi(503, 'MIGRACION_PENDIENTE', 'Falta correr la migración 0011 en Supabase.')
  }
  if (error) throw error

  return respuestaOk(data)
})
