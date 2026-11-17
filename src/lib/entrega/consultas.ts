// Solo servidor: lecturas de la fase 9D (migración 0018). Si la 0018 todavía no está corrida,
// devuelven null y la pantalla sigue como antes.
import type { CodigoEntrega, DatosCierre } from '@/types/entrega'

type ClienteSupabase = Awaited<ReturnType<typeof import('@/lib/api/supabase-servidor').createServerSupabaseClient>>

// 42703 columna · PGRST202 función · 42P01 / PGRST205 tabla · PGRST200 relación inexistentes
const faltaMigracion = (error: { code?: string } | null) =>
  ['42703', 'PGRST202', '42P01', 'PGRST205', 'PGRST200'].includes(error?.code ?? '')

interface FilaCierre {
  entregado_en: string | null
  recibe_nombre: string | null
  recibe_ci: string | null
  completado_en: string | null
  conforme_en: string | null
  pagos: { cobrado_en: string | null; monto_cobrado: number | null } | null
  calificaciones_entrega: DatosCierre['calificacion'] | DatosCierre['calificacion'][] | null
}

// Quién recibió, cuándo se completó, el cobro en efectivo y la calificación. Dueño o admin (por RLS).
export async function leerCierre(supabase: ClienteSupabase, pedidoId: string): Promise<DatosCierre | null> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('entregado_en, recibe_nombre, recibe_ci, completado_en, conforme_en, pagos(cobrado_en, monto_cobrado), calificaciones_entrega(estrellas, comentario, created_at)')
    .eq('id', pedidoId)
    .maybeSingle()

  if (faltaMigracion(error)) return null
  if (error) throw error
  if (!data) return null

  const fila = data as unknown as FilaCierre
  const calificacion = Array.isArray(fila.calificaciones_entrega) ? fila.calificaciones_entrega[0] ?? null : fila.calificaciones_entrega

  return {
    entregado_en: fila.entregado_en,
    recibe_nombre: fila.recibe_nombre,
    recibe_ci: fila.recibe_ci,
    completado_en: fila.completado_en,
    conforme_en: fila.conforme_en,
    cobrado_en: fila.pagos?.cobrado_en ?? null,
    monto_cobrado: fila.pagos?.monto_cobrado ?? null,
    calificacion: calificacion ?? null,
  }
}

// El código de entrega: la base solo lo da al dueño. Llamar solo cuando quien pide es el dueño.
export async function leerCodigoEntrega(supabase: ClienteSupabase, pedidoId: string): Promise<CodigoEntrega | null> {
  const { data, error } = await supabase.rpc('mi_codigo_entrega', { p_pedido_id: pedidoId })
  if (faltaMigracion(error)) return null
  if (error) throw error
  return (data ?? null) as CodigoEntrega | null
}

export async function leerMisCodigos(supabase: ClienteSupabase): Promise<Map<string, CodigoEntrega>> {
  const { data, error } = await supabase.rpc('mis_codigos_entrega')
  if (faltaMigracion(error)) return new Map()
  if (error) throw error
  return new Map(((data ?? []) as CodigoEntrega[]).map((c) => [c.pedido_id, c]))
}
