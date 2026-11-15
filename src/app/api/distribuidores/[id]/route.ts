import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { COLUMNAS_DISTRIBUIDOR } from '@/lib/abastecimiento/consultas'
import { esquemaEditarDistribuidor } from '@/lib/abastecimiento/esquemas'
import type { Distribuidor } from '@/types/abastecimiento'

// PATCH /api/distribuidores/:id — Solo admin. Edita la ficha o la desactiva ({ activo: false }).
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cambios = await validarCuerpo(request, esquemaEditarDistribuidor)

  const { data, error } = await supabase
    .from('distribuidores')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS_DISTRIBUIDOR)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El distribuidor no existe.')

  return respuestaOk(data as Distribuidor)
})
