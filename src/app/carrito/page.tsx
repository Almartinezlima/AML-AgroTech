'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useCarrito } from '@/context/CarritoContext'

export default function CarritoPage() {
  const { items, actualizarCantidad, eliminarItem, total, limpiarCarrito } = useCarrito()
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)

  const handleConfirmar = () => {
    setPedidoConfirmado(true)
    limpiarCarrito()
  }

  if (pedidoConfirmado) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
        <div className="bg-[#111811] border border-[#22c55e] rounded-2xl p-12 text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#f0fdf4] mb-2">¡Pedido confirmado!</h2>
          <p className="text-[#86efac] mb-2">Tu pedido <span className="text-[#22c55e] font-mono">#P-00{Math.floor(Math.random() * 9) + 1}</span> fue registrado.</p>
          <p className="text-[#86efac] text-sm mb-8">El distribuidor se pondrá en contacto contigo para coordinar la entrega.</p>
          <Link href="/catalogo" className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
            Seguir comprando
          </Link>
        </div>
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

          {/* Lista */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-5 flex gap-4">
                <div className="bg-[#162016] rounded-xl w-20 h-20 flex items-center justify-center text-4xl flex-shrink-0">
                  {item.icono}
                </div>
                <div className="flex-1">
                  <span className="text-[#22c55e] text-xs">{item.categoria}</span>
                  <h3 className="text-[#f0fdf4] font-semibold mb-1">{item.nombre}</h3>
                  <p className="text-[#86efac] text-xs mb-3">Unidad: {item.unidad}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] text-[#f0fdf4] w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold">−</button>
                      <span className="text-[#f0fdf4] font-semibold w-6 text-center">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        className="bg-[#162016] border border-[#1a2e1a] hover:border-[#22c55e] text-[#f0fdf4] w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold">+</button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#22c55e] font-bold">Bs. {(item.precio * item.cantidad).toFixed(2)}</span>
                      <button onClick={() => eliminarItem(item.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors">🗑️ Quitar</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Link href="/catalogo" className="text-[#22c55e] hover:text-[#16a34a] text-sm transition-colors">← Seguir comprando</Link>
          </div>

          {/* Resumen */}
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-6 h-fit sticky top-20">
            <h2 className="text-[#f0fdf4] font-bold text-lg mb-6">Resumen del pedido</h2>
            <div className="flex flex-col gap-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[#86efac]">{item.nombre} x{item.cantidad}</span>
                  <span className="text-[#f0fdf4]">Bs. {(item.precio * item.cantidad).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#1a2e1a] pt-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#86efac]">Subtotal</span>
                <span className="text-[#f0fdf4]">Bs. {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-[#86efac]">Envío</span>
                <span className="text-[#22c55e]">A coordinar</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span className="text-[#f0fdf4]">Total</span>
                <span className="text-[#22c55e]">Bs. {total.toFixed(2)}</span>
              </div>
            </div>
            <div className="bg-[#162016] border border-[#1a2e1a] rounded-xl p-4 mb-6">
              <p className="text-[#86efac] text-xs">📍 <strong className="text-[#f0fdf4]">Entrega:</strong> El distribuidor coordinará contigo por WhatsApp o llamada.</p>
            </div>
            <button onClick={handleConfirmar}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold py-4 rounded-xl transition-colors text-lg">
              ✅ Confirmar pedido
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
