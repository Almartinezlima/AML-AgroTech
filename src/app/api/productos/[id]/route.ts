import { createServerSupabaseClient } from '@/lib/api/supabase-servidor'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { validarCuerpo, validarUuid } from '@/lib/api/validacion'
import { COLUMNAS_PRODUCTO } from '@/lib/ecommerce/consultas'
import { esquemaEditarProducto } from '@/lib/ecommerce/esquemas'
import type { Producto } from '@/types/comercio'

export const dynamic = 'force-dynamic'

type Contexto = { params: { id: string } }

// GET /api/productos/:id — Público. La RLS oculta los inactivos a quien no es admin.
export const GET = manejarRuta<Contexto>(async (_request, { params }) => {
  const id = validarUuid(params.id)
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('productos')
    .select(COLUMNAS_PRODUCTO)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El producto no existe.')

  return respuestaOk(data as unknown as Producto)
})

// PATCH /api/productos/:id — Solo admin. No permite editar el stock.
export const PATCH = manejarRuta<Contexto>(async (request, { params }) => {
  const { supabase } = await requerirAdmin()
  const id = validarUuid(params.id)
  const cambios = await validarCuerpo(request, esquemaEditarProducto)

  const { data, error } = await supabase
    .from('productos')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS_PRODUCTO)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ErrorApi(404, 'NO_ENCONTRADO', 'El producto no existe.')

  return respuestaOk(data as unknown as Producto)
})
