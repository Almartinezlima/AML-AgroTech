import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { buscarClientes } from '@/lib/ecommerce/consultas'
import type { CalificacionAdmin, ResumenCalificaciones } from '@/types/entrega'

export const dynamic = 'force-dynamic'

interface FilaCalificacion {
  id: string
  pedido_id: string
  usuario_id: string
  estrellas: number
  comentario: string | null
  created_at: string
  pedidos: { codigo: string } | null
}

// GET /api/calificaciones — Solo admin. Promedio, cantidad, bajas (1-2 estrellas) y las 10 últimas.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const { data, error } = await supabase
    .from('calificaciones_entrega')
    .select('id, pedido_id, usuario_id, estrellas, comentario, created_at, pedidos(codigo)')
    .order('created_at', { ascending: false })

  // Sin la 0018 todavía no hay calificaciones
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return respuestaOk<ResumenCalificaciones>({ total: 0, promedio: null, bajas: 0, ultimas: [] })
  }
  if (error) throw error

  const filas = (data ?? []) as unknown as FilaCalificacion[]
  const ultimas = filas.slice(0, 10)
  const clientes = await buscarClientes(supabase, ultimas.map((f) => f.usuario_id))
  const suma = filas.reduce((total, f) => total + f.estrellas, 0)

  return respuestaOk<ResumenCalificaciones>({
    total: filas.length,
    promedio: filas.length ? Math.round((suma / filas.length) * 10) / 10 : null,
    bajas: filas.filter((f) => f.estrellas <= 2).length,
    ultimas: ultimas.map<CalificacionAdmin>((f) => ({
      id: f.id,
      pedido_id: f.pedido_id,
      codigo: f.pedidos?.codigo ?? null,
      cliente: clientes.get(f.usuario_id)?.nombre ?? null,
      estrellas: f.estrellas,
      comentario: f.comentario,
      created_at: f.created_at,
    })),
  })
})
