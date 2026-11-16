import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaEmpacar } from '@/lib/almacen/esquemas'

// POST /api/almacen/pedidos/:id/empacar — Almacén o admin. Exige todo marcado y ningún faltante abierto.
// Recojo queda "listo para recoger"; el resto, "empacado" para el repartidor.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirRol(['almacen'])
  const id = validarUuid(params.id)
  const { bultos } = await validarCuerpo(request, esquemaEmpacar)

  const { data, error } = await supabase.rpc('empacar_pedido', { p_pedido_id: id, p_bultos: bultos })
  if (error) throw error

  return respuestaOk(data)
})
