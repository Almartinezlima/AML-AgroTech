import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { costoPorUnidad } from '@/lib/abastecimiento/presentacion'
import { esCorreoPrueba } from '@/lib/pruebas'
import type { CiudadDistribuidor, OpcionReponer, ProductoReponer } from '@/types/abastecimiento'

export const dynamic = 'force-dynamic'

interface FilaProducto {
  id: string
  nombre: string
  sku: string | null
  unidad: string
  stock: number
  stock_minimo: number
}

interface FilaPresentacion {
  id: string
  distribuidor_id: string
  producto_id: string
  nombre: string
  unidades_por_presentacion: number
  precio_mayorista: number
  distribuidor: { nombre_comercial: string; ciudad: CiudadDistribuidor; activo: boolean; cuenta: { email: string } | null } | null
}

// GET /api/abastecimiento/reponer — Solo admin. Cada producto activo con las presentaciones
// que se le pueden pedir (de la más barata por unidad a la más cara). `para_reponer` marca
// los que están en su mínimo o hasta 1,5× el mínimo; los demás sirven para "Pedir otro producto".
export const GET = manejarRuta(async () => {
  const { supabase } = await requerirAdmin()

  const [productos, presentaciones] = await Promise.all([
    supabase.from('productos').select('id, nombre, sku, unidad, stock, stock_minimo').eq('activo', true).order('nombre'),
    supabase
      .from('presentaciones_distribuidor')
      .select('id, distribuidor_id, producto_id, nombre, unidades_por_presentacion, precio_mayorista, distribuidor:distribuidores(nombre_comercial, ciudad, activo, cuenta:perfiles(email))')
      .eq('activo', true)
      .eq('disponible', true),
  ])
  if (productos.error) throw productos.error
  if (presentaciones.error) throw presentaciones.error

  const opcionesDe = new Map<string, OpcionReponer[]>()
  for (const p of presentaciones.data as unknown as FilaPresentacion[]) {
    if (!p.distribuidor?.activo) continue
    const opcion: OpcionReponer = {
      presentacion_id: p.id,
      distribuidor_id: p.distribuidor_id,
      distribuidor: p.distribuidor.nombre_comercial,
      ciudad: p.distribuidor.ciudad,
      nombre: p.nombre,
      unidades_por_presentacion: p.unidades_por_presentacion,
      precio_mayorista: Number(p.precio_mayorista),
      costo_por_unidad: costoPorUnidad(Number(p.precio_mayorista), p.unidades_por_presentacion),
      es_prueba: esCorreoPrueba(p.distribuidor.cuenta?.email),
    }
    opcionesDe.set(p.producto_id, [...(opcionesDe.get(p.producto_id) ?? []), opcion])
  }

  const lista: ProductoReponer[] = (productos.data as FilaProducto[]).map((p) => ({
    ...p,
    para_reponer: p.stock <= p.stock_minimo * 1.5,
    opciones: (opcionesDe.get(p.id) ?? []).sort((a, b) => a.costo_por_unidad - b.costo_por_unidad),
  }))

  // Lo más urgente primero: cuánto queda respecto del mínimo
  const urgencia = (p: ProductoReponer) => (p.stock_minimo > 0 ? p.stock / p.stock_minimo : p.stock)
  lista.sort((a, b) => Number(b.para_reponer) - Number(a.para_reponer) || urgencia(a) - urgencia(b) || a.nombre.localeCompare(b.nombre, 'es'))

  return respuestaOk(lista)
})
