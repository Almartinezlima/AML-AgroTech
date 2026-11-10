import { estiloCategoria } from '@/lib/categorias'

// Etiqueta de categoría con su color (semillas verde, riego azul, agroquímicos naranja…)
export default function EtiquetaCategoria({ categoria, className = '' }: { categoria?: string | null; className?: string }) {
  const estilo = estiloCategoria(categoria)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilo.etiqueta} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: estilo.color }} aria-hidden="true" />
      {estilo.nombre}
    </span>
  )
}
