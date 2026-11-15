import { formatoBs } from '@/lib/utils'
import type { Presentacion } from '@/types/abastecimiento'

// Costo por unidad de venta de la tienda: bidón 20 L a Bs. 1.640 = Bs. 82,00 por litro
export function costoPorUnidad(precioMayorista: number, unidades: number) {
  return unidades > 0 ? Number(precioMayorista) / unidades : 0
}

// "Bs. 82,00 por litro"
export function textoCostoPorUnidad(presentacion: Pick<Presentacion, 'precio_mayorista' | 'unidades_por_presentacion' | 'productos'>) {
  const unidad = presentacion.productos?.unidad ?? 'unidad'
  return `${formatoBs(costoPorUnidad(presentacion.precio_mayorista, presentacion.unidades_por_presentacion))} por ${unidad}`
}

// "1 litro", "60 litros", "50 unidades", "3 sacos 50kg": se pluraliza la primera palabra.
// La misma regla que aml_plural_unidad de la migración 0015 (motivo del kardex).
export function cantidadConUnidad(cantidad: number, unidad: string | null | undefined) {
  const texto = unidad?.trim() || 'unidad'
  if (cantidad === 1) return `${cantidad} ${texto}`
  const [palabra, ...resto] = texto.split(' ')
  const plural = /[aeiouáéíóú]$/i.test(palabra) ? `${palabra}s` : /z$/i.test(palabra) ? `${palabra.slice(0, -1)}ces` : `${palabra}es`
  return [`${cantidad} ${plural}`, ...resto].join(' ')
}

// "trae 20 litros"
export function textoUnidades(unidades: number, unidad: string | undefined) {
  return `trae ${cantidadConUnidad(unidades, unidad)}`
}

// Días que tarda: el de la presentación o, si no tiene, el de la ficha
export function diasDeEntrega(presentacion: Pick<Presentacion, 'dias_entrega'>, diasFicha: number) {
  const dias = presentacion.dias_entrega ?? diasFicha
  return dias === 0 ? 'Entrega el mismo día' : `Entrega en ${dias} día${dias === 1 ? '' : 's'}`
}
