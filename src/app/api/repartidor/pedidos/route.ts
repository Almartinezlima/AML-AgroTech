import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import type { PedidoReparto } from '@/types/entrega'

export const dynamic = 'force-dynamic'

// GET /api/repartidor/pedidos — Repartidor o admin. Pedidos a domicilio empacados (el más
// antiguo primero) y los que ya van en camino. Nunca trae el código de entrega.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirRol(['repartidor'])

  const { data, error } = await supabase.rpc('cola_reparto')
  if (error) throw error

  return respuestaOk<PedidoReparto[]>((data ?? []) as PedidoReparto[])
})
