import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { manejarRuta, respuestaError, respuestaOk } from '@/lib/api/respuestas'

// Sin esto Next.js guardaría la respuesta en el build
export const dynamic = 'force-dynamic'

// GET /api/salud — Público. Indica si la app y la base responden.
export const GET = manejarRuta(async () => {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('categorias')
    .select('id', { head: true, count: 'exact' })
    .limit(1)

  if (error) {
    console.error('Salud: la base no responde:', error.message)
    return respuestaError(503, 'BASE_NO_DISPONIBLE', 'La base de datos no responde.')
  }

  return respuestaOk({ estado: 'ok' })
})
