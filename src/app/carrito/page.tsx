'use client'
import Link from 'next/link'
import ImagenProducto from '@/components/ImagenProducto'
import { BloqueCarga } from '@/components/ui/Estados'
import { useCarrito } from '@/context/CarritoContext'
import { formatoBs } from '@/lib/utils'

export default function CarritoPage() {
  const { items, actualizarCantidad, eliminarItem, total, listo } = useCarrito()

  if (!listo) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
        <div className="max-w-6xl mx-auto"><BloqueCarga filas={3} /></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-[#f0fdf4] mb-2">Tu carrito está vacío</h2>
          <p className="text-[#86efac] mb-8">Agrega productos desde el catálogo</p>
          <Link href="/catalogo" className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold px-8 py-3 rounded-xl transition-colors">
            Ver Catálogo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Mi Carrito</h1>
        <p className="text-[#86efac] mb-8">{items.length} producto{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-4 sm:p-5 flex gap-4">
                <ImagenProducto nombre={item.nombre} imagen={item.imagen_url} icono={item.icono} categoria={item.categoria}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex-shrink-0" tamanoIcono="text-3xl" sizes="80px" />
                <div className="flex-1 min-w-0">
                  <span className="text-[#22c55e] text-xs">{item.categoria}</span>
                  <h3 className="text-[#f0fdf4] font-semibold mb-1 break-words">{item.nombre}</h3>
                  <p className="text-[#86efac] text-xs mb-3">Unidad: {item.unidad} · Disponibles: {item.stock}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button aria-label={`Quitar uno de ${item.nombre}`} disabled={item.cantidad <= 1} onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] disabled:opacity-40 text-[#f0fdf4] w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold">−</button>
                      <span className="text-[#f0fdf4] font-semibold w-6 text-center">{item.cantidad}</span>
                      <button aria-label={`Agregar uno de ${item.nombre}`} disabled={item.cantidad >= item.stock} onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] disabled:opacity-40 text-[#f0fdf4] w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold">+</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#22c55e] font-bold">{formatoBs(item.precio * item.cantidad)}</span>
                      <button onClick={() => eliminarItem(item.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">🗑️ Quitar</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link href="/catalogo" className="text-[#22c55e] hover:text-[#16a34a] text-sm transition-colors">← Seguir comprando</Link>
          </div>

          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-6 h-fit lg:sticky lg:top-20">
            <h2 className="text-[#f0fdf4] font-bold text-lg mb-6">Resumen</h2>
            <div className="flex justify-between font-bold text-lg mb-2">
              <span className="text-[#f0fdf4]">Subtotal</span>
              <span className="text-[#22c55e]">{formatoBs(total)}</span>
            </div>
            <p className="text-[#86efac] text-xs mb-6">El costo de envío se calcula al elegir la zona de entrega.</p>
            <Link href="/checkout" className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-4 rounded-xl transition-colors text-lg text-center">
              Continuar con la compra
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
