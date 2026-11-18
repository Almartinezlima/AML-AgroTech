import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaResolverFaltante } from '@/lib/almacen/esquemas'

// POST /api/faltantes/:id/resolver — Solo admin. "Repuesto, continuar": ya se puede dejar listo para salir.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const { nota } = await validarCuerpo(request, esquemaResolverFaltante)

  const { data, error } = await supabase.rpc('resolver_faltante', { p_faltante_id: id, p_nota: nota })
  if (error) throw error

  return respuestaOk(data)
})
