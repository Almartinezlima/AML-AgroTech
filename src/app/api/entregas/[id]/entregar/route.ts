import { manejarRuta, respuestaError, respuestaOk } from '@/lib/api/respuestas'
import { requerirRol } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { esquemaEntregar } from '@/lib/entrega/esquemas'
import type { ResultadoEntrega } from '@/types/entrega'

// POST /api/entregas/:id/entregar — Entrega con el código de 4 dígitos del cliente.
// Repartidor que la lleva (domicilio) o admin (también recojo en tienda).
// 422 CODIGO_INCORRECTO con los intentos que quedan · 409 CODIGO_BLOQUEADO a los 5 intentos.
export const POST = manejarRuta<{ params: { id: string } }>(async (request, { params }) => {
  const { supabase } = await requerirRol(['repartidor'])
  const id = validarUuid(params.id)
  const entrega = await validarCuerpo(request, esquemaEntregar)

  const { data, error } = await supabase.rpc('entregar_pedido', {
    p_pedido_id: id,
    p_codigo: entrega.codigo,
    p_recibe_nombre: entrega.nombre,
    p_recibe_ci: entrega.ci || null,
  })
  if (error) throw error

  // Un código incorrecto no es error de la base: así el intento queda contado
  const resultado = data as ResultadoEntrega
  if (!resultado.ok) {
    const detalle = { bloqueado: Boolean(resultado.bloqueado), intentos_restantes: resultado.intentos_restantes ?? 0 }
    if (detalle.bloqueado) {
      return respuestaError(409, 'CODIGO_BLOQUEADO', 'El código se bloqueó tras 5 intentos fallidos. La tienda tiene que revisarlo y desbloquearlo.', detalle)
    }
    const quedan = detalle.intentos_restantes
    return respuestaError(422, 'CODIGO_INCORRECTO', `Código incorrecto. ${quedan === 1 ? 'Queda 1 intento' : `Quedan ${quedan} intentos`}.`, detalle)
  }

  return respuestaOk(resultado)
})
