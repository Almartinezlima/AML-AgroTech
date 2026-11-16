import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import type { PedidoCola } from '@/types/almacen'

export const dynamic = 'force-dynamic'

// GET /api/almacen/pedidos — Almacén o admin. Cola de preparación, el más antiguo primero.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirRol(['almacen'])

  const { data, error } = await supabase.rpc('cola_almacen')
  if (error) throw error

  return respuestaOk<PedidoCola[]>((data ?? []) as PedidoCola[])
})
