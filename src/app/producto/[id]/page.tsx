'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ImagenProducto from '@/components/ImagenProducto'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_NIVEL, nivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

export default function ProductoPage() {
  const { id } = useParams<{ id: string }>()
  const { datos: producto, cargando, error, recargar } = useDatosApi<Producto>(`/api/productos/${id}`)
  const { agregarItem } = useCarrito()
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)

  if (cargando) return <div className={clasePagina}><div className="max-w-5xl mx-auto"><BloqueCarga filas={2} alto="h-64" /></div></div>
  if (error || !producto) {
    return (
      <div className={clasePagina}>
        <div className="max-w-5xl mx-auto"><BloqueError mensaje={error || 'El producto no existe.'} onReintentar={() => void recargar()} /></div>
      </div>
    )
  }

  const agotado = producto.stock === 0
  const nivel = INFO_NIVEL[nivelStock(producto.stock, producto.stock_minimo)]

  const agregar = () => {
    agregarItem(productoParaCarrito(producto), cantidad)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <Link href="/catalogo" className="text-[#22c55e] hover:text-[#16a34a] text-sm">← Volver al catálogo</Link>

        <div className={`${claseTarjeta} overflow-hidden grid grid-cols-1 md:grid-cols-2 mt-4`}>
          <ImagenProducto
            nombre={producto.nombre}
            imagen={producto.imagen_url}
            icono={producto.icono}
            categoria={producto.categorias?.nombre}
            className="h-64 md:h-full md:min-h-96"
            tamanoIcono="text-8xl"
            sizes="(max-width: 768px) 100vw, 512px"
          />

          <div className="p-6 flex flex-col gap-4">
            <div>
              <span className="text-[#22c55e] text-sm">{producto.categorias?.nombre}</span>
              <h1 className="text-2xl font-bold text-[#f0fdf4] mt-1">{producto.nombre}</h1>
              {producto.sku && <p className="text-[#86efac] text-xs mt-1">Código: {producto.sku}</p>}
            </div>

            <p className="text-3xl font-bold text-[#22c55e]">
              {formatoBs(producto.precio)} <span className="text-sm font-normal text-[#86efac]">por {producto.unidad}</span>
            </p>

            <div className="flex items-center gap-3">
              <Insignia info={nivel} />
              <span className="text-[#86efac] text-sm">{agotado ? 'Sin unidades por ahora' : `${producto.stock} disponibles`}</span>
            </div>

            {producto.descripcion && <p className="text-[#86efac] text-sm leading-relaxed">{producto.descripcion}</p>}

            {!agotado && (
              <div className="flex items-center gap-3 mt-auto">
                <button aria-label="Quitar uno" disabled={cantidad <= 1} onClick={() => setCantidad(c => c - 1)}
                  className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] disabled:opacity-40 text-[#f0fdf4] w-10 h-10 rounded-lg font-bold">−</button>
                <span className="text-[#f0fdf4] font-semibold w-8 text-center">{cantidad}</span>
                <button aria-label="Agregar uno" disabled={cantidad >= producto.stock} onClick={() => setCantidad(c => c + 1)}
                  className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] disabled:opacity-40 text-[#f0fdf4] w-10 h-10 rounded-lg font-bold">+</button>
              </div>
            )}

            <button onClick={agregar} disabled={agotado} className={`${claseBotonPrimario} w-full`}>
              {agregado ? '✅ Agregado' : agotado ? 'Sin stock' : '🛒 Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
