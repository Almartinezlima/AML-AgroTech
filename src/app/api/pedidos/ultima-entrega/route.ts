import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import type { UltimaEntrega } from '@/types/comercio'

export const dynamic = 'force-dynamic'

// GET /api/pedidos/ultima-entrega — Datos de entrega del último pedido del usuario de la sesión,
// para rellenar el checkout (fase 4). Solo sus propios pedidos (filtro + RLS). Devuelve null si
// no tiene pedidos. La zona solo vuelve si sigue activa (ej.: Sucre ya no).
export const GET = manejarRuta(async () => {
  const { supabase, user } = await requerirSesion()

  const { data: pedido, error } = await supabase
    .from('pedidos')
    .select('zona_envio_id, direccion_entrega, telefono_contacto, recoge_nombre, recoge_ci, zonas_envio(activo)')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!pedido) return respuestaOk<UltimaEntrega | null>(null)

  const zona = pedido.zonas_envio as unknown as { activo: boolean } | null

  return respuestaOk<UltimaEntrega>({
    zona_id: zona?.activo ? pedido.zona_envio_id : null,
    direccion: pedido.direccion_entrega,
    telefono: pedido.telefono_contacto,
    recoge_nombre: pedido.recoge_nombre,
    recoge_ci: pedido.recoge_ci,
  })
})
