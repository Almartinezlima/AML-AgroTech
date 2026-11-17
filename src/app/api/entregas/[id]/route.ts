import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarUuid } from '@/lib/api/validacion'
import type { DetalleEntrega } from '@/types/entrega'

export const dynamic = 'force-dynamic'

// GET /api/entregas/:id — Datos para entregar. Repartidor (domicilio), almacén (recojo) o admin.
// La base decide qué pedido puede ver cada uno; el código de entrega nunca viene.
export const GET = manejarRuta<{ params: { id: string } }>(async (_request, { params }) => {
  const { supabase } = await requerirRol(['repartidor', 'almacen'])
  const id = validarUuid(params.id)

  const { data, error } = await supabase.rpc('detalle_entrega', { p_pedido_id: id })
  if (error) throw error

  return respuestaOk<DetalleEntrega>(data as DetalleEntrega)
})
