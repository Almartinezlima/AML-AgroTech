import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRepartidor } from '@/lib/api/sesion'
import type { PanelRepartidor } from '@/types/entrega'

export const dynamic = 'force-dynamic'

// GET /api/repartidor/panel — Solo repartidor. Disponibilidad, entregas disponibles (sin datos del
// cliente; vacías si no está disponible), las que aceptó, lo ganado y lo que falta cobrar.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirRepartidor()

  const { data, error } = await supabase.rpc('panel_repartidor')
  if (error) throw error

  return respuestaOk<PanelRepartidor>(data as PanelRepartidor)
})
