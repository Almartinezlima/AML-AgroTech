import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarParametros } from '@/lib/api/validacion'
import { parametroPruebas } from '@/lib/pruebas'
import type { Dashboard } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({ pruebas: parametroPruebas })

// GET /api/dashboard — Solo admin. Todas las cifras salen de la base.
// Sin pedidos ni pagos de cuentas de prueba salvo ?pruebas=1 (migración 0011).
export const GET = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { pruebas } = validarParametros(request, esquemaParametros)

  let { data, error } = await supabase.rpc('resumen_dashboard', { p_incluir_pruebas: pruebas })

  // Compatibilidad mientras no se corra la 0011: la base solo conoce la versión sin
  // parámetros (PGRST202 = función no encontrada), que cuenta también los datos de prueba
  if (error?.code === 'PGRST202') ({ data, error } = await supabase.rpc('resumen_dashboard'))
  if (error) throw error

  return respuestaOk(data as Dashboard)
})
