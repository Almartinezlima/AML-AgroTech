import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaDespacharOrden } from '@/lib/abastecimiento/esquemas'
import { llamarFuncionOrden } from '@/lib/abastecimiento/ordenesServidor'

// POST /api/ordenes-compra/:id/despachar — Solo el proveedor dueño de una orden aceptada, con transportista y guía.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirDistribuidor()
  const id = validarUuid(params.id)
  const cuerpo = await validarCuerpo(request, esquemaDespacharOrden)

  const data = await llamarFuncionOrden(supabase, 'despachar_orden_compra', { p_orden_id: id, p_transportista: cuerpo.transportista, p_guia: cuerpo.guia })
  return respuestaOk(data)
})
