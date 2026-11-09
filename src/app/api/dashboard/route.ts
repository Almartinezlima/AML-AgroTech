import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { Dashboard } from '@/types/comercio'

export const dynamic = 'force-dynamic'

// GET /api/dashboard — Solo admin. Todas las cifras salen de la base.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase.rpc('resumen_dashboard')
  if (error) throw error

  return respuestaOk(data as Dashboard)
})
