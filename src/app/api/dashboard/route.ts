import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import type { Dashboard } from '@/types/comercio'

export const dynamic = 'force-dynamic'

// GET /api/dashboard — Solo admin. Todas las cifras salen de la base.
// Cuenta los pedidos y pagos de todas las cuentas, también las de prueba.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  let { data, error } = await supabase.rpc('resumen_dashboard', { p_incluir_pruebas: true })

  // Compatibilidad mientras no se corra la 0011: la base solo conoce la versión sin
  // parámetros (PGRST202 = función no encontrada), que cuenta también los datos de prueba
  if (error?.code === 'PGRST202') ({ data, error } = await supabase.rpc('resumen_dashboard'))
  if (error) throw error

  return respuestaOk(data as Dashboard)
})
