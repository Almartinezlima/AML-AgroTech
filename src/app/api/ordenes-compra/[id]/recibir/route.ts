import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaRecibirOrden } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/recibir — Solo admin y solo despachada. Recepción única: entra al kardex fraccionada,
// actualiza el costo promedio y anota los faltantes (todo en 0 = no llegó nada).
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cuerpo = await validarCuerpo(request, esquemaRecibirOrden)

  const data = await llamarFuncionOrden(supabase, 'recibir_orden_compra', { p_orden_id: id, p_lineas: cuerpo.lineas, p_nota: cuerpo.nota || null })
  return respuestaOk(data)
})
