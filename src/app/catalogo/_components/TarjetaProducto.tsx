import Link from 'next/link'
import ImagenProducto from '@/components/ImagenProducto'
import Insignia from '@/components/ui/Insignia'
import { INFO_NIVEL, nivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

interface TarjetaProductoProps {
  producto: Producto
  agregado: boolean
  onAgregar: (producto: Producto) => void
}

export default function TarjetaProducto({ producto, agregado, onAgregar }: TarjetaProductoProps) {
  const agotado = producto.stock === 0
  const nivel = INFO_NIVEL[nivelStock(producto.stock, producto.stock_minimo)]

  return (
    <div className="bg-[#111811] border border-[#1a2e1a] hover:border-[#22c55e] rounded-xl overflow-hidden transition-all hover:bg-[#162016] group flex flex-col">
      <Link href={`/producto/${producto.id}`}>
        <ImagenProducto nombre={producto.nombre} imagen={producto.imagen_url} icono={producto.icono} categoria={producto.categorias?.nombre} />
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[#22c55e] text-xs font-medium">{producto.categorias?.nombre}</span>
        <Link href={`/producto/${producto.id}`} className="text-[#f0fdf4] font-semibold mt-1 mb-1 group-hover:text-[#22c55e] transition-colors text-sm">
          {producto.nombre}
        </Link>
        <p className="text-[#86efac] text-xs mb-3 line-clamp-2">{producto.descripcion}</p>
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[#22c55e] font-bold">{formatoBs(producto.precio)}</span>
            <Insignia info={agotado ? nivel : { ...nivel, etiqueta: `Stock: ${producto.stock}` }} />
          </div>
          <p className="text-[#86efac] text-xs mb-3">Unidad: {producto.unidad}</p>
          <button
            onClick={() => onAgregar(producto)}
            disabled={agotado}
            className={`w-full font-semibold py-2 rounded-lg transition-all text-sm ${
              agregado
                ? 'bg-[#16a34a] text-[#f0fdf4]'
                : agotado
                ? 'bg-[#1a2e1a] text-[#86efac] cursor-not-allowed'
                : 'bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a]'
            }`}
          >
            {agregado ? '✅ Agregado' : agotado ? 'Sin stock' : '🛒 Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  )
}
