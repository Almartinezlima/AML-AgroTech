import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { PedidoCola } from '@/types/almacen'

export const dynamic = 'force-dynamic'

// GET /api/almacen/pedidos — Solo admin (fase 9F: ya no hay rol almacén). Cola de preparación, el más antiguo primero.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase.rpc('cola_almacen')
  if (error) throw error

  return respuestaOk<PedidoCola[]>((data ?? []) as PedidoCola[])
})
