// Identidad visual de cada categoría: foto real y color (docs/DISENO.md).
// Las fotos viven en public/categorias/ (fuentes en docs/CREDITOS_IMAGENES.md).
// Los nombres coinciden con la tabla public.categorias.

export interface EstiloCategoria {
  nombre: string
  foto: string
  descripcion: string
  // Color de la categoría (hex) para puntos, bordes y detalles
  color: string
  // Clases de Tailwind para la etiqueta de la categoría
  etiqueta: string
}

const CATEGORIAS: Record<string, EstiloCategoria> = {
  'Semillas': {
    nombre: 'Semillas',
    foto: '/categorias/semillas.webp',
    descripcion: 'Papa, maíz y hortalizas para la siembra',
    color: '#4ade80',
    etiqueta: 'bg-[#4ade80]/15 text-[#166534] ring-[#16a34a]/30',
  },
  'Riego': {
    nombre: 'Riego',
    foto: '/categorias/riego.webp',
    descripcion: 'Aspersores, goteo y mangueras',
    color: '#38bdf8',
    etiqueta: 'bg-[#38bdf8]/15 text-[#075985] ring-[#0284c7]/30',
  },
  'Agroquímicos': {
    nombre: 'Agroquímicos',
    foto: '/categorias/agroquimicos.webp',
    descripcion: 'Fertilizantes, fungicidas e insecticidas',
    color: '#fb923c',
    etiqueta: 'bg-[#fb923c]/15 text-[#9a3412] ring-[#ea580c]/30',
  },
  'Herramientas': {
    nombre: 'Herramientas',
    foto: '/categorias/herramientas.webp',
    descripcion: 'Azadones, palas, picotas y fumigadoras',
    color: '#c8956a',
    etiqueta: 'bg-[#c8956a]/20 text-[#7c4a21] ring-[#a16207]/30',
  },
  'Cañerías': {
    nombre: 'Cañerías',
    foto: '/categorias/canerias.webp',
    descripcion: 'Tubos PVC, codos y válvulas',
    color: '#94a3b8',
    etiqueta: 'bg-[#94a3b8]/20 text-[#334155] ring-[#64748b]/30',
  },
}

// Orden en que se muestran en la portada
export const ORDEN_CATEGORIAS = ['Semillas', 'Agroquímicos', 'Riego', 'Herramientas', 'Cañerías']

const GENERICA: Omit<EstiloCategoria, 'nombre'> = {
  foto: '/categorias/semillas.webp',
  descripcion: 'Insumos agrícolas',
  color: '#22c55e',
  etiqueta: 'bg-acento/10 text-acento ring-acento/30',
}

export function estiloCategoria(nombre?: string | null): EstiloCategoria {
  return (nombre && CATEGORIAS[nombre]) || { nombre: nombre ?? 'Productos', ...GENERICA }
}

export function listaCategorias(): EstiloCategoria[] {
  return ORDEN_CATEGORIAS.map((n) => CATEGORIAS[n])
}
