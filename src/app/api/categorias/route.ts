import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import type { Categoria } from '@/types/comercio'

export const dynamic = 'force-dynamic'

// GET /api/categorias — Público.
export const GET = manejarRuta(async () => {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, icono, descripcion')
    .eq('activo', true)
    .order('nombre')

  if (error) throw error

  return respuestaOk(data as Categoria[])
})
