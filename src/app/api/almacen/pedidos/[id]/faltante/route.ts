import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaFaltante } from '@/lib/almacen/esquemas'

// POST /api/almacen/pedidos/:id/faltante — Almacén o admin. Avisa al admin por Telegram.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirRol(['almacen'])
  const id = validarUuid(params.id)
  const { nota, item_id } = await validarCuerpo(request, esquemaFaltante)

  const { data, error } = await supabase.rpc('reportar_faltante', {
    p_pedido_id: id,
    p_item_id: item_id ?? null,
    p_nota: nota,
  })
  if (error) throw error

  return respuestaOk(data, 201)
})
