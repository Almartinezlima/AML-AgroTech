import type { MargenProducto, ResumenMargen } from '@/types/abastecimiento'
import { costoPorUnidad } from './presentacion'

interface ProductoPrecio { id: string; nombre: string; sku: string | null; unidad: string; precio: number }
interface Costo { producto_id: string; costo_promedio: number; costo_ultimo: number }
interface PresentacionCosto { producto_id: string; unidades_por_presentacion: number; precio_mayorista: number }

// Margen por producto: precio de venta − costo. Costo real = promedio ponderado de las
// recepciones; si todavía no hubo ninguna, se estima con el proveedor más barato por unidad.
export function calcularMargen(productos: ProductoPrecio[], costos: Costo[], presentaciones: PresentacionCosto[]): ResumenMargen {
  const real = new Map(costos.map((c) => [c.producto_id, c]))
  const masBarato = new Map<string, number>()
  for (const p of presentaciones) {
    const costo = costoPorUnidad(Number(p.precio_mayorista), p.unidades_por_presentacion)
    const actual = masBarato.get(p.producto_id)
    if (actual === undefined || costo < actual) masBarato.set(p.producto_id, costo)
  }

  const filas: MargenProducto[] = productos.map((p) => {
    const precio = Number(p.precio)
    const conCosto = real.get(p.id)
    const estimado = masBarato.get(p.id)
    const costo = conCosto ? Number(conCosto.costo_promedio) : estimado ?? null
    const margen = costo === null ? null : precio - costo
    return {
      id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      unidad: p.unidad,
      precio,
      costo,
      tipo_costo: conCosto ? 'real' : estimado !== undefined ? 'estimado' : 'sin_costo',
      costo_ultimo: conCosto ? Number(conCosto.costo_ultimo) : null,
      margen_bs: margen,
      margen_pct: margen === null || precio <= 0 ? null : (margen / precio) * 100,
    }
  })

  // Del margen más chico al más grande; los que no tienen costo, al final
  filas.sort((a, b) => {
    if (a.margen_pct === null) return b.margen_pct === null ? a.nombre.localeCompare(b.nombre, 'es') : 1
    if (b.margen_pct === null) return -1
    return a.margen_pct - b.margen_pct
  })

  const conMargen = filas.filter((f) => f.margen_pct !== null)
  return {
    productos: filas,
    // Promedio simple del % entre los productos con costo (real o estimado)
    margen_promedio: conMargen.length ? conMargen.reduce((suma, f) => suma + (f.margen_pct ?? 0), 0) / conMargen.length : null,
    con_costo: filas.filter((f) => f.tipo_costo === 'real').length,
    estimados: filas.filter((f) => f.tipo_costo === 'estimado').length,
    sin_costo: filas.filter((f) => f.tipo_costo === 'sin_costo').length,
    menores: conMargen.slice(0, 3),
  }
}
