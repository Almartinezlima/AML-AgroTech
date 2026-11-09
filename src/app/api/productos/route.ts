import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarParametros } from '@/lib/api/validacion'
import { COLUMNAS_PRODUCTO } from '@/lib/ecommerce/consultas'
import { esquemaCrearProducto } from '@/lib/ecommerce/esquemas'
import type { Producto } from '@/types/comercio'

export const dynamic = 'force-dynamic'

const esquemaParametros = z.object({ alcance: z.enum(['activos', 'todos']).default('activos') })

// GET /api/productos — Público. Con ?alcance=todos, solo admin.
export const GET = manejarRuta(async (request: NextRequest) => {
  const { alcance } = validarParametros(request, esquemaParametros)
  const supabase = alcance === 'todos' ? (await requerirAdmin()).supabase : await createServerSupabaseClient()

  let consulta = supabase.from('productos').select(COLUMNAS_PRODUCTO).order('nombre')
  if (alcance === 'activos') consulta = consulta.eq('activo', true)

  const { data, error } = await consulta
  if (error) throw error

  return respuestaOk(data as unknown as Producto[])
})

// POST /api/productos — Solo admin. El producto nace con stock 0.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const producto = await validarCuerpo(request, esquemaCrearProducto)

  const { data, error } = await supabase
    .from('productos')
    .insert(producto)
    .select(COLUMNAS_PRODUCTO)
    .single()

  if (error) throw error

  return respuestaOk(data as unknown as Producto, 201)
})
