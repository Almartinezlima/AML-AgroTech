import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { PedidoReparto } from '@/types/entrega'

export const dynamic = 'force-dynamic'

// GET /api/entregas — Solo admin. A domicilio listos para salir o en camino, con quién la lleva.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase.rpc('cola_reparto')
  if (error) throw error

  return respuestaOk<PedidoReparto[]>((data ?? []) as PedidoReparto[])
})
