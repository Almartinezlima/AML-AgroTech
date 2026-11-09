import Image from 'next/image'

interface ImagenProductoProps {
  nombre: string
  imagen?: string | null
  icono?: string | null
  categoria?: string | null
  className?: string
  tamanoIcono?: string
  sizes?: string
}

const TONO_CATEGORIA: Record<string, string> = {
  Agroquímicos: 'from-[#14321f] to-[#0f1d13]',
  Riego: 'from-[#12303a] to-[#0f1a1d]',
  Cañerías: 'from-[#2c2a18] to-[#171810]',
  Herramientas: 'from-[#2f2416] to-[#191510]',
  Semillas: 'from-[#22351a] to-[#121c0f]',
}

// Foto del producto o, si no tiene, un fondo por categoría con su icono
export default function ImagenProducto({
  nombre,
  imagen,
  icono,
  categoria,
  className = 'h-40',
  tamanoIcono = 'text-5xl',
  sizes = '(max-width: 640px) 100vw, 320px',
}: ImagenProductoProps) {
  if (imagen) {
    return (
      <div className={`relative overflow-hidden bg-[#162016] ${className}`}>
        <Image src={imagen} alt={nombre} fill sizes={sizes} className="object-cover" />
      </div>
    )
  }

  const tono = (categoria && TONO_CATEGORIA[categoria]) || 'from-[#162016] to-[#111811]'

  return (
    <div className={`bg-gradient-to-br ${tono} flex items-center justify-center ${tamanoIcono} ${className}`} aria-hidden="true">
      {icono ?? '📦'}
    </div>
  )
}
