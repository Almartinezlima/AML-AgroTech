import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { COLUMNAS_ZONA } from '@/lib/ecommerce/consultas'
import { esquemaEditarZona } from '@/lib/ecommerce/esquemas'
import type { ZonaEnvio } from '@/types/comercio'

// PATCH /api/zonas-envio/:id — Solo admin.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cambios = await validarCuerpo(request, esquemaEditarZona)

  const { data, error } = await supabase
    .from('zonas_envio')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS_ZONA)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'La zona no existe.')

  return respuestaOk(data as ZonaEnvio)
})
