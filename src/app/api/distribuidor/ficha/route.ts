import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { COLUMNAS_DISTRIBUIDOR } from '@/lib/abastecimiento/consultas'
import type { Distribuidor } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

// GET /api/distribuidor/ficha — Solo distribuidor. Su ficha, o null si la tienda aún no la cargó.
export const GET = manejarRuta(async () => {
  const { supabase, user, perfil } = await requerirSesion()
  if (perfil.rol !== 'distribuidor') throw new ErrorApi(403, 'SIN_PERMISO', 'No tienes permiso para esta acción.')

  const { data, error } = await supabase
    .from('distribuidores')
    .select(COLUMNAS_DISTRIBUIDOR)
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (error) throw error

  return respuestaOk((data as Distribuidor | null) ?? null)
})
