import Image from 'next/image'
import Link from 'next/link'
import { LuArrowRight } from 'react-icons/lu'
import { listaCategorias } from '@/lib/categorias'

// Categorías con foto real y su color
export default function CategoriasPortada() {
  const categorias = listaCategorias()
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {categorias.map((c, i) => (
        <Link
          key={c.nombre}
          href={`/catalogo?categoria=${encodeURIComponent(c.nombre)}`}
          className={`group relative isolate flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl border border-borde p-4 shadow-lg shadow-black/30 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}
        >
          <Image src={c.foto} alt="" fill sizes="(max-width: 768px) 50vw, 20vw" className="-z-20 object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/5" aria-hidden="true" />
          <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: c.color }} aria-hidden="true" />
          <h3 className="font-titulo text-xl font-bold text-white">{c.nombre}</h3>
          <p className="mt-1 text-xs text-white/80">{c.descripcion}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: c.color }}>
            Ver productos <LuArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  )
}
