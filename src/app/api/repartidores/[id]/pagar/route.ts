import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaPagarRepartidor } from '@/lib/entrega/esquemas'

// POST /api/repartidores/:id/pagar — Solo admin. "Pagado": marca todos los envíos entregados sin
// pagar. El monto es el que el admin vio: si cambió en el medio, 409 y no se marca nada.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { monto } = await validarCuerpo(request, esquemaPagarRepartidor)

  const { data, error } = await supabase.rpc('pagar_repartidor', { p_repartidor_id: id, p_monto: monto })
  if (error) throw error

  return respuestaOk(data)
})
