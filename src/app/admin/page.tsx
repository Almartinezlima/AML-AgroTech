'use client'
import Link from 'next/link'

const stats = [
  { titulo: 'Productos activos', valor: '48', icono: '📦', color: 'border-[#22c55e]', sub: '+3 esta semana' },
  { titulo: 'Pedidos hoy', valor: '12', icono: '🛒', color: 'border-blue-500', sub: 'Bs. 4,320 en ventas' },
  { titulo: 'Stock bajo', valor: '5', icono: '⚠️', color: 'border-yellow-500', sub: 'Requieren reposición' },
  { titulo: 'Usuarios registrados', valor: '87', icono: '👥', color: 'border-purple-500', sub: '+6 este mes' },
]

const ultimosPedidos = [
  { id: '#P-001', cliente: 'Juan Mamani', productos: 'Fertilizante NPK, Herbicida', total: 150.00, estado: 'Pendiente', fecha: '11/09/2026' },
  { id: '#P-002', cliente: 'Rosa Flores', productos: 'Kit Riego por Goteo', total: 320.00, estado: 'Confirmado', fecha: '11/09/2026' },
  { id: '#P-003', cliente: 'Carlos Quispe', productos: 'Semillas Maíz Híbrido x2', total: 290.00, estado: 'Entregado', fecha: '10/09/2026' },
  { id: '#P-004', cliente: 'María Condori', productos: 'Bomba Mochila 20L', total: 220.00, estado: 'Pendiente', fecha: '10/09/2026' },
  { id: '#P-005', cliente: 'Pedro Vargas', productos: 'Azadón Reforzado x3', total: 285.00, estado: 'Cancelado', fecha: '09/09/2026' },
]

const colorEstado: Record<string, string> = {
  'Pendiente': 'bg-yellow-900 text-yellow-400',
  'Confirmado': 'bg-blue-900 text-blue-400',
  'Entregado': 'bg-green-900 text-green-400',
  'Cancelado': 'bg-red-900 text-red-400',
}

const stockBajo = [
  { nombre: 'Bomba de Mochila 20L', stock: 35, minimo: 50, categoria: 'Herramientas' },
  { nombre: 'Kit Riego por Goteo', stock: 45, minimo: 50, categoria: 'Riego' },
  { nombre: 'Fungicida Mancozeb', stock: 18, minimo: 30, categoria: 'Agroquímicos' },
  { nombre: 'Aspersor Rotativo', stock: 22, minimo: 40, categoria: 'Riego' },
  { nombre: 'Semillas Papa Waycha', stock: 12, minimo: 30, categoria: 'Semillas' },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f0fdf4]">Panel de Administración</h1>
            <p className="text-[#86efac] mt-1">AML AgroTech — Sucre, Bolivia</p>
          </div>
          <div className="flex items-center gap-2 bg-[#111811] border border-[#1a2e1a] rounded-xl px-4 py-2">
            <span className="text-[#22c55e]">👤</span>
            <span className="text-[#86efac] text-sm">Administrador</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.titulo} className={`bg-[#111811] border-l-4 ${stat.color} border-t border-r border-b border-[#1a2e1a] rounded-xl p-5`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#86efac] text-sm">{stat.titulo}</span>
                <span className="text-2xl">{stat.icono}</span>
              </div>
              <div className="text-3xl font-bold text-[#f0fdf4] mb-1">{stat.valor}</div>
              <div className="text-[#86efac] text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: '/admin/productos', icono: '📦', label: 'Gestionar Productos' },
            { href: '/admin/inventario', icono: '📊', label: 'Inventario' },
            { href: '/admin/usuarios', icono: '👥', label: 'Usuarios' },
            { href: '/pedidos', icono: '🛒', label: 'Pedidos' },
          ].map((acceso) => (
            <Link key={acceso.href} href={acceso.href}
              className="bg-[#111811] border border-[#1a2e1a] hover:border-[#22c55e] rounded-xl p-4 text-center transition-all hover:bg-[#162016] group">
              <div className="text-3xl mb-2">{acceso.icono}</div>
              <div className="text-[#86efac] text-sm group-hover:text-[#22c55e] transition-colors font-medium">{acceso.label}</div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Últimos pedidos */}
          <div className="lg:col-span-2 bg-[#111811] border border-[#1a2e1a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#1a2e1a]">
              <h2 className="text-[#f0fdf4] font-semibold">Últimos Pedidos</h2>
              <Link href="/pedidos" className="text-[#22c55e] text-sm hover:underline">Ver todos →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2e1a]">
                    <th className="text-left text-[#86efac] text-xs px-5 py-3">ID</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-3">Cliente</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-3 hidden md:table-cell">Total</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosPedidos.map((pedido) => (
                    <tr key={pedido.id} className="border-b border-[#1a2e1a] hover:bg-[#162016] transition-colors">
                      <td className="px-5 py-3 text-[#22c55e] text-sm font-mono">{pedido.id}</td>
                      <td className="px-5 py-3">
                        <div className="text-[#f0fdf4] text-sm">{pedido.cliente}</div>
                        <div className="text-[#86efac] text-xs hidden sm:block">{pedido.fecha}</div>
                      </td>
                      <td className="px-5 py-3 text-[#f0fdf4] text-sm hidden md:table-cell">Bs. {pedido.total.toFixed(2)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${colorEstado[pedido.estado]}`}>
                          {pedido.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock bajo */}
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#1a2e1a]">
              <h2 className="text-[#f0fdf4] font-semibold">⚠️ Stock Bajo</h2>
              <Link href="/admin/inventario" className="text-[#22c55e] text-sm hover:underline">Ver →</Link>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {stockBajo.map((item) => (
                <div key={item.nombre} className="bg-[#162016] border border-[#1a2e1a] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#f0fdf4] text-sm font-medium">{item.nombre}</span>
                    <span className="text-yellow-400 text-xs font-bold">{item.stock} u.</span>
                  </div>
                  <div className="text-[#86efac] text-xs mb-2">{item.categoria}</div>
                  <div className="w-full bg-[#0a0f0a] rounded-full h-1.5">
                    <div
                      className="bg-yellow-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((item.stock / item.minimo) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-[#86efac] text-xs mt-1">Mínimo: {item.minimo} u.</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
