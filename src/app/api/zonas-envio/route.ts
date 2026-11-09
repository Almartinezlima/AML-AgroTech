import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarParametros } from '@/lib/api/validacion'
import { COLUMNAS_ZONA } from '@/lib/ecommerce/consultas'
import { esquemaCrearZona } from '@/lib/ecommerce/esquemas'
import type { ZonaEnvio } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({ alcance: z.enum(['activas', 'todas']).default('activas') })

// GET /api/zonas-envio — Público. Con ?alcance=todas, solo admin.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { alcance } = validarParametros(request, esquemaParametros)
  const supabase = alcance === 'todas' ? (await requerirAdmin()).supabase : await createServerSupabaseClient()

  let consulta = supabase.from('zonas_envio').select(COLUMNAS_ZONA).order('orden')
  if (alcance === 'activas') consulta = consulta.eq('activo', true)

  const { data, error } = await consulta
  if (error) throw error

  return respuestaOk(data as ZonaEnvio[])
})

// POST /api/zonas-envio — Solo admin.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const zona = await validarCuerpo(request, esquemaCrearZona)

  const { data, error } = await supabase
    .from('zonas_envio')
    .insert(zona)
    .select(COLUMNAS_ZONA)
    .single()

  if (error) throw error

  return respuestaOk(data as ZonaEnvio, 201)
})
