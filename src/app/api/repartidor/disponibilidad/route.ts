import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirRepartidor } from '@/lib/api/sesion'
import { validarCuerpo } from '@/lib/api/validacion'
import { esquemaDisponibilidad } from '@/lib/entrega/esquemas'

// PATCH /api/repartidor/disponibilidad — Solo repartidor. "Estoy disponible / No disponible".
export const PATCH = manejarRuta(async (request) => {
  const { supabase } = await requerirRepartidor()
  const { disponible } = await validarCuerpo(request, esquemaDisponibilidad)

  const { data, error } = await supabase.rpc('cambiar_disponibilidad', { p_disponible: disponible })
  if (error) throw error

  return respuestaOk(data)
})
