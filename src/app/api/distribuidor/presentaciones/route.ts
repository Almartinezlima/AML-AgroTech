import type { NextRequest } from 'next/server'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { validarCuerpo } from '@/lib/api/validacion'
import { COLUMNAS_PRESENTACION, presentacionDuplicada } from '@/lib/abastecimiento/consultas'
import { esquemaCrearPresentacion } from '@/lib/abastecimiento/esquemas'
import type { Presentacion } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

// GET /api/distribuidor/presentaciones — Solo distribuidor. Las suyas, activas e inactivas.
export const GET = manejarRuta(async () => {
  const { supabase, distribuidorId } = await requerirDistribuidor()

  const { data, error } = await supabase
    .from('presentaciones_distribuidor')
    .select(COLUMNAS_PRESENTACION)
    .eq('distribuidor_id', distribuidorId)
    .order('activo', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return respuestaOk(data as unknown as Presentacion[])
})

// POST /api/distribuidor/presentaciones — Solo distribuidor. Siempre a su propia ficha.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase, distribuidorId } = await requerirDistribuidor()
  const presentacion = await validarCuerpo(request, esquemaCrearPresentacion)

  // Solo productos que la tienda vende hoy
  const { data: producto, error: errorProducto } = await supabase
    .from('productos')
    .select('id')
    .eq('id', presentacion.producto_id)
    .eq('activo', true)
    .maybeSingle()

  if (errorProducto) throw errorProducto
  if (!producto) throw new ErrorApi(422, 'DATOS_INVALIDOS', 'Ese producto no está en la tienda.')

  const { data, error } = await supabase
    .from('presentaciones_distribuidor')
    .insert({ ...presentacion, distribuidor_id: distribuidorId })
    .select(COLUMNAS_PRESENTACION)
    .single()

  if (error) throw presentacionDuplicada(error)

  return respuestaOk(data as unknown as Presentacion, 201)
})
