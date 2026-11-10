import Link from 'next/link'
import { LuCheck, LuShoppingCart } from 'react-icons/lu'
import EtiquetaCategoria from '@/components/EtiquetaCategoria'
import ImagenProducto from '@/components/ImagenProducto'
import { estiloCategoria } from '@/lib/categorias'
import { nivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

interface TarjetaProductoProps {
  producto: Producto
  agregado: boolean
  onAgregar: (producto: Producto) => void
  prioridad?: boolean
}

const TEXTO_STOCK = {
  agotado: { texto: 'Agotado', clase: 'text-red-400' },
  bajo: { texto: 'Últimas unidades', clase: 'text-[#fbbf24]' },
  normal: { texto: 'Disponible', clase: 'text-texto-2' },
}

export default function TarjetaProducto({ producto, agregado, onAgregar, prioridad = false }: TarjetaProductoProps) {
  const agotado = producto.stock === 0
  const categoria = producto.categorias?.nombre
  const color = estiloCategoria(categoria).color
  const stock = TEXTO_STOCK[nivelStock(producto.stock, producto.stock_minimo)]

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-borde bg-tarjeta shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--color-cat)] hover:shadow-2xl hover:shadow-black/50"
      style={{ ['--color-cat' as string]: `${color}80` }}
    >
      <Link href={`/producto/${producto.id}`} tabIndex={-1} aria-hidden="true" className="relative block overflow-hidden">
        <ImagenProducto
          nombre={producto.nombre}
          imagen={producto.imagen_url}
          categoria={categoria}
          prioridad={prioridad}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 300px"
          className="aspect-square transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Franja del color de la categoría */}
        <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: color }} aria-hidden="true" />
        {agotado && (
          <span className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">Agotado</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <EtiquetaCategoria categoria={categoria} className="self-start" />
        <Link href={`/producto/${producto.id}`} className="line-clamp-2 font-semibold leading-snug text-texto transition-colors hover:text-acento">
          {producto.nombre}
        </Link>
        <p className="line-clamp-2 text-xs text-texto-2/90">{producto.descripcion}</p>

        <div className="mt-auto pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-titulo text-2xl font-bold tabular-nums tracking-tight text-texto">{formatoBs(producto.precio)}</p>
            <span className="text-xs text-texto-2">por {producto.unidad}</span>
          </div>
          <p className={`mb-3 mt-0.5 text-xs ${stock.clase}`}>
            {agotado ? 'Sin unidades por ahora' : `${stock.texto} · Stock: ${producto.stock}`}
          </p>
          <button
            onClick={() => onAgregar(producto)}
            disabled={agotado}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
              agregado
                ? 'bg-acento-hover text-texto'
                : agotado
                ? 'cursor-not-allowed bg-borde text-texto-2'
                : 'bg-acento text-fondo shadow-md shadow-acento/20 hover:bg-acento-hover'
            }`}
          >
            {agregado ? (
              <><LuCheck className="h-4 w-4" aria-hidden="true" /> Agregado</>
            ) : agotado ? 'Sin stock' : (
              <><LuShoppingCart className="h-4 w-4" aria-hidden="true" /> Agregar al carrito</>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
