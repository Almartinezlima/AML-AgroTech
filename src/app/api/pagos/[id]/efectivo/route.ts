import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'

// POST /api/pagos/:id/efectivo — Solo admin: "Recibí el efectivo" que cobró el repartidor o el
// almacén. El pago queda verificado y, si ya se entregó, el pedido queda completado.
export const POST = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('confirmar_efectivo', { p_pago_id: id })
  if (error) throw error

  return respuestaOk(data)
})
