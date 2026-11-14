import type { BandaToxicologica, TendenciaPrecio } from '@/types/comercio'

// Bandas toxicológicas de las etiquetas de agroquímicos en Bolivia (clasificación OMS).
// Fondo: color oficial de la banda. Texto: el que da contraste AA sobre ese fondo.
export const INFO_BANDA: Record<BandaToxicologica, { etiqueta: string; peligro: string; fondo: string; texto: string }> = {
  roja: { etiqueta: 'Banda roja', peligro: 'Altamente peligroso', fondo: '#d50032', texto: '#ffffff' },
  amarilla: { etiqueta: 'Banda amarilla', peligro: 'Moderadamente peligroso', fondo: '#fedd00', texto: '#17251b' },
  azul: { etiqueta: 'Banda azul', peligro: 'Ligeramente peligroso', fondo: '#003da5', texto: '#ffffff' },
  verde: { etiqueta: 'Banda verde', peligro: 'Normalmente no ofrece peligro', fondo: '#009a44', texto: '#03140a' },
}

// La tendencia habla del MERCADO, no de nuestro precio
export const INFO_TENDENCIA: Record<TendenciaPrecio, { etiqueta: string }> = {
  al_alza: { etiqueta: 'Mercado al alza' },
  estable: { etiqueta: 'Mercado estable' },
  a_la_baja: { etiqueta: 'Mercado a la baja' },
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// '2026-09-07' → '7 sep 2026'. Se arma a mano: con new Date() la zona horaria (UTC-4) corre el día.
export function formatoFechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  if (!anio || !mes || !dia) return fecha
  return `${dia} ${MESES[mes - 1]} ${anio}`
}
