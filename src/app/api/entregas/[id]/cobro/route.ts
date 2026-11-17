import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaCobro } from '@/lib/entrega/esquemas'

// POST /api/entregas/:id/cobro — Contra entrega: registra el efectivo recibido (igual al total).
// Repartidor (domicilio), almacén (recojo) o admin. Si no cobra el admin, queda por rendir.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirRol(['repartidor', 'almacen'])
  const id = validarUuid(params.id)
  const { monto } = await validarCuerpo(request, esquemaCobro)

  const { data, error } = await supabase.rpc('registrar_cobro_entrega', { p_pedido_id: id, p_monto: monto })
  if (error) throw error

  return respuestaOk(data)
})
