'use client'
import Link from 'next/link'

// Tipo de estado posible para un pedido
type EstadoPedido = 'Pendiente' | 'Confirmado' | 'Entregado' | 'Cancelado'

interface Pedido {
  id: string
  fecha: string
  productos: string[]
  total: number
  estado: EstadoPedido
}

const pedidos: Pedido[] = [
  { id: '#P-001', fecha: '11/09/2026', productos: ['Fertilizante NPK 20-20-20 x2', 'Herbicida Glifosato x1'], total: 235.00, estado: 'Pendiente' },
  { id: '#P-002', fecha: '10/09/2026', productos: ['Kit Riego por Goteo x1'], total: 320.00, estado: 'Confirmado' },
  { id: '#P-003', fecha: '08/09/2026', productos: ['Semillas Maíz Híbrido x3', 'Azadón Reforzado x1'], total: 530.00, estado: 'Entregado' },
]

// Colores de badge según el estado del pedido
const colorEstado: Record<EstadoPedido, string> = {
  Pendiente: 'bg-yellow-900 text-yellow-400',
  Confirmado: 'bg-blue-900 text-blue-400',
  Entregado: 'bg-green-900 text-green-400',
  Cancelado: 'bg-red-900 text-red-400',
}

export default function PedidosPage() {
  if (pedidos.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-[#f0fdf4] mb-2">Aún no tienes pedidos</h2>
          <p className="text-[#86efac] mb-8">Explora el catálogo y realiza tu primera compra</p>
          <Link href="/catalogo" className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold px-8 py-3 rounded-xl transition-colors">
            Ver Catálogo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Mis Pedidos</h1>
        <p className="text-[#86efac] mb-8">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} realizado{pedidos.length !== 1 ? 's' : ''}</p>

        <div className="flex flex-col gap-4">
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-[#111811] border border-[#1a2e1a] hover:border-[#22c55e] rounded-xl p-5 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[#22c55e] font-mono font-semibold">{pedido.id}</span>
                  <span className="text-[#86efac] text-sm">{pedido.fecha}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${colorEstado[pedido.estado]}`}>
                  {pedido.estado}
                </span>
              </div>

              <ul className="text-[#86efac] text-sm mb-3 list-disc list-inside">
                {pedido.productos.map((producto) => (
                  <li key={producto}>{producto}</li>
                ))}
              </ul>

              <div className="flex justify-between items-center border-t border-[#1a2e1a] pt-3">
                <span className="text-[#86efac] text-sm">Total</span>
                <span className="text-[#22c55e] font-bold text-lg">Bs. {pedido.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
