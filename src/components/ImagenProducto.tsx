import Image from 'next/image'
import { estiloCategoria } from '@/lib/categorias'

interface ImagenProductoProps {
  nombre: string
  imagen?: string | null
  categoria?: string | null
  className?: string
  sizes?: string
  prioridad?: boolean
  // Se acepta por compatibilidad con llamadas anteriores; ya no se dibujan íconos
  icono?: string | null
}

// Foto real del producto de borde a borde. Si un producto nuevo aún no tiene foto,
// se muestra la foto de su categoría (nunca un ícono ni una imagen rota).
export default function ImagenProducto({
  nombre,
  imagen,
  categoria,
  className = 'aspect-square',
  sizes = '(max-width: 640px) 100vw, 320px',
  prioridad = false,
}: ImagenProductoProps) {
  if (imagen) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <Image src={imagen} alt={nombre} fill sizes={sizes} priority={prioridad} className="object-cover" />
      </div>
    )
  }

  const estilo = estiloCategoria(categoria)
  return (
    <div className={`relative overflow-hidden bg-tarjeta-hover ${className}`}>
      <Image src={estilo.foto} alt={`${nombre} (foto de la categoría ${estilo.nombre})`} fill sizes={sizes} className="object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
    </div>
  )
}
