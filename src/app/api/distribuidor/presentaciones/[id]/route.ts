import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { COLUMNAS_PRESENTACION, presentacionDuplicada } from '@/lib/abastecimiento/consultas'
import { esquemaEditarPresentacion } from '@/lib/abastecimiento/esquemas'
import type { Presentacion } from '@/types/abastecimiento'

// PATCH /api/distribuidor/presentaciones/:id — Solo el distribuidor dueño. Nada se borra:
// para dejar de venderla se manda { activo: false }.
export const PATCH = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase, distribuidorId } = await requerirDistribuidor()
  const id = validarUuid(params.id)
  const cambios = await validarCuerpo(request, esquemaEditarPresentacion)

  const { data, error } = await supabase
    .from('presentaciones_distribuidor')
    .update(cambios)
    .eq('id', id)
    .eq('distribuidor_id', distribuidorId)
    .select(COLUMNAS_PRESENTACION)
    .maybeSingle()

  if (error) throw presentacionDuplicada(error)
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'La presentación no existe.')

  return respuestaOk(data as unknown as Presentacion)
})
