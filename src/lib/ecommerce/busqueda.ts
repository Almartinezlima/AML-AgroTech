import type { Producto } from '@/types/comercio'

// Quita tildes y mayúsculas: "Válvula" y "valvula" son lo mismo
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Palabras que el agricultor usa para lo mismo (todas normalizadas)
const SINONIMOS: Record<string, string[]> = {
  abono: ['fertilizante', 'npk', 'urea', 'foliar'],
  fertilizante: ['abono', 'npk', 'urea', 'foliar'],
  veneno: ['insecticida', 'fungicida', 'herbicida'],
  fumigadora: ['mochila', 'pulverizador'],
  fumigar: ['mochila', 'insecticida', 'fungicida'],
  tubo: ['tuberia', 'manguera'],
  cano: ['tuberia', 'codo'],
  pico: ['picota'],
  azada: ['azadon'],
  choclo: ['maiz'],
}

// Todo el texto en el que se busca: nombre, descripción, categoría y SKU
function textoDe(p: Producto): string {
  return normalizar([p.nombre, p.descripcion ?? '', p.categorias?.nombre ?? '', p.sku ?? ''].join(' '))
}

/**
 * Busca sin tildes en nombre, descripción, categoría y SKU.
 * Con varias palabras, cada una tiene que aparecer (o uno de sus sinónimos).
 */
export function coincideBusqueda(producto: Producto, consulta: string): boolean {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return true
  const texto = textoDe(producto)
  return palabras.every((palabra) => [palabra, ...(SINONIMOS[palabra] ?? [])].some((p) => texto.includes(p)))
}
