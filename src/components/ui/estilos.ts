// Patrón único del sitio (docs/DISENO.md): botones, campos, tarjetas, filtros y páginas.
// Los colores salen de los tokens de tailwind.config.ts / globals.css; acá no van hex sueltos.

// ───── Botones ─────
// Radio rounded-xl y 44 px de alto en todos los tamaños (área táctil).
type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'peligro-lleno' | 'suave'
type TamanoBoton = 'normal' | 'chico'

const BASE_BOTON =
  'inline-flex items-center justify-center gap-2 min-h-11 rounded-xl text-center transition disabled:opacity-60 disabled:cursor-not-allowed'

const VARIANTES_BOTON: Record<VarianteBoton, string> = {
  primario: 'bg-acento hover:bg-acento-hover text-white font-bold shadow-tarjeta active:scale-[0.98] disabled:active:scale-100',
  secundario: 'bg-tarjeta border border-borde hover:border-acento hover:bg-tarjeta-hover text-texto font-semibold',
  peligro: 'bg-tarjeta border border-estado-error/40 hover:bg-estado-error/5 text-estado-error-texto font-semibold',
  'peligro-lleno': 'bg-estado-error-texto hover:bg-estado-error-texto/90 text-white font-bold',
  suave: 'bg-acento/10 hover:bg-acento/15 text-acento font-semibold',
}

const TAMANOS_BOTON: Record<TamanoBoton, string> = {
  normal: 'px-5 py-3',
  chico: 'px-3.5 py-2 text-sm',
}

export const claseBoton = (variante: VarianteBoton, tamano: TamanoBoton = 'normal') =>
  `${BASE_BOTON} ${VARIANTES_BOTON[variante]} ${TAMANOS_BOTON[tamano]}`

export const claseBotonPrimario = claseBoton('primario')
export const claseBotonSecundario = claseBoton('secundario')
export const claseBotonPeligro = claseBoton('peligro')

// Botón cuadrado de − / + (carrito, ficha)
export const claseBotonCantidad =
  'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-borde bg-tarjeta text-texto transition hover:border-acento hover:bg-tarjeta-hover disabled:opacity-40'

// Enlace dentro de texto o tarjeta
export const claseEnlace = 'font-semibold text-acento underline-offset-2 hover:underline'

// ───── Campos ─────
export const claseInput =
  'w-full min-w-0 bg-tarjeta-hover border border-borde hover:border-borde-fuerte focus:border-acento focus-visible:outline-none focus:ring-2 focus:ring-acento/25 text-texto rounded-xl px-4 py-3 outline-none transition-colors'
export const claseEtiqueta = 'text-texto-2 text-sm font-medium mb-2 block'
export const claseAyuda = 'text-texto-2 text-xs mt-1.5'

// ───── Filtros (chips) ─────
// Fila de chips: en celular se desplaza dentro de su propia fila, nunca la página
export const claseFilaFiltros = '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0'
export const claseFiltro = (activo: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition ${
    activo
      ? 'bg-acento text-white font-semibold shadow-tarjeta'
      : 'bg-tarjeta border border-borde text-texto font-medium hover:border-acento'
  }`

// ───── Tarjetas y página ─────
export const claseTarjeta = 'bg-tarjeta border border-borde rounded-2xl shadow-tarjeta'
export const clasePagina = 'min-h-screen bg-fondo py-8 sm:py-10 px-4 sm:px-6'
export const claseTituloPagina = 'font-titulo text-3xl sm:text-4xl font-bold tracking-tight text-texto'
// Título de las pantallas del panel (mismo tamaño que antes, ahora igual en todas)
export const claseTituloAdmin = 'font-titulo text-3xl font-bold tracking-tight text-texto'
// Título de una sección dentro de una tarjeta
export const claseTituloSeccion = 'font-titulo text-lg font-bold text-texto'

// ───── Tonos de estado (texto suelto, sin insignia) ─────
export const claseTextoPendiente = 'text-estado-pendiente-texto'
export const claseTextoError = 'text-estado-error-texto'
