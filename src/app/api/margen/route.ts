import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { migracionPendiente } from '@/lib/abastecimiento/consultas'
import { calcularMargen } from '@/lib/abastecimiento/margen'

export const dynamic = 'force-dynamic'

// GET /api/margen — Solo admin. Precio, costo y margen de cada producto activo. El costo es el
// promedio ponderado de las recepciones; hasta la primera recepción se estima con el
// proveedor más barato por unidad.
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const [productos, costos, presentaciones] = await Promise.all([
    supabase.from('productos').select('id, nombre, sku, unidad, precio').eq('activo', true),
    supabase.from('costos_producto').select('producto_id, costo_promedio, costo_ultimo'),
    supabase
      .from('presentaciones_distribuidor')
      .select('producto_id, unidades_por_presentacion, precio_mayorista, distribuidor:distribuidores(activo)')
      .eq('activo', true)
      .eq('disponible', true),
  ])
  if (productos.error) throw productos.error
  if (costos.error) throw migracionPendiente(costos.error)
  if (presentaciones.error) throw presentaciones.error

  return respuestaOk(
    calcularMargen(
      productos.data as { id: string; nombre: string; sku: string | null; unidad: string; precio: number }[],
      costos.data as { producto_id: string; costo_promedio: number; costo_ultimo: number }[],
      (presentaciones.data as unknown as { producto_id: string; unidades_por_presentacion: number; precio_mayorista: number; distribuidor: { activo: boolean } | null }[])
        .filter((p) => p.distribuidor?.activo)
    )
  )
})
