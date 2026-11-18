import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { DeudasRepartidores } from '@/types/entrega'

export const dynamic = 'force-dynamic'

// GET /api/repartidores — Solo admin. Cuánto se debe a cada repartidor (envíos entregados sin
// pagar) y los últimos pagos con quién y cuándo.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase.rpc('deudas_repartidores')
  if (error) throw error

  return respuestaOk<DeudasRepartidores>(data as DeudasRepartidores)
})
