import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirDistribuidor } from '@/lib/api/sesion'
import { COLUMNAS_ORDEN, migracionPendiente } from '@/lib/abastecimiento/consultas'
import type { OrdenCompra, OrdenCompraResumen } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

// GET /api/distribuidor/ordenes — Solo el proveedor: sus órdenes desde que se envían (nunca
// los borradores de la tienda). Además de la RLS, se filtra por su ficha.
export const GET = manejarRuta(async () => {
  const { supabase, distribuidorId } = await requerirDistribuidor()

  const { data, error } = await supabase
    .from('ordenes_compra')
    .select(`${COLUMNAS_ORDEN}, lineas:orden_compra_items(cantidad)`)
    .eq('distribuidor_id', distribuidorId)
    .neq('estado', 'borrador')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw migracionPendiente(error)

  const ordenes: OrdenCompraResumen[] = (data as unknown as (OrdenCompra & { lineas: { cantidad: number }[] | null })[]).map(
    ({ lineas, ...orden }) => ({ ...orden, cantidad_lineas: (lineas ?? []).filter((l) => l.cantidad > 0).length })
  )
  return respuestaOk(ordenes)
})
