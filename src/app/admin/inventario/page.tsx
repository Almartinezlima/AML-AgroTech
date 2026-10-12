'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Producto {
  id: string
  nombre: string
  stock: number
  stock_minimo: number
  icono: string
  categorias: { nombre: string }
}

export default function AdminInventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [cargando, setCargando] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, stock, stock_minimo, icono, categorias(nombre)')
        .eq('activo', true)
        .order('stock', { ascending: true })
      if (data) setProductos(data as unknown as Producto[])
      setCargando(false)
    }
    cargar()
  }, [])

  const productosFiltrados = productos.filter(p => {
    if (filtro === 'ok') return p.stock > p.stock_minimo
    if (filtro === 'bajo') return p.stock > 0 && p.stock <= p.stock_minimo
    if (filtro === 'sin') return p.stock === 0
    return true
  })

  const stockBajo = productos.filter(p => p.stock <= p.stock_minimo && p.stock > 0).length
  const sinStock = productos.filter(p => p.stock === 0).length

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Inventario</h1>
        <p className="text-[#86efac] mb-8">{productos.length} productos registrados</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111811] border-l-4 border-[#22c55e] border-t border-r border-b border-[#1a2e1a] rounded-xl p-5">
            <p className="text-[#86efac] text-sm">Total productos</p>
            <p className="text-3xl font-bold text-[#f0fdf4] mt-1">{productos.length}</p>
          </div>
          <div className="bg-[#111811] border-l-4 border-yellow-500 border-t border-r border-b border-[#1a2e1a] rounded-xl p-5">
            <p className="text-[#86efac] text-sm">Stock bajo</p>
            <p className="text-3xl font-bold text-[#f0fdf4] mt-1">{stockBajo}</p>
            <p className="text-yellow-400 text-xs mt-1">Requieren reposición</p>
          </div>
          <div className="bg-[#111811] border-l-4 border-red-500 border-t border-r border-b border-[#1a2e1a] rounded-xl p-5">
            <p className="text-[#86efac] text-sm">Sin stock</p>
            <p className="text-3xl font-bold text-[#f0fdf4] mt-1">{sinStock}</p>
            <p className="text-red-400 text-xs mt-1">Agotados</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { val: 'todos', label: 'Todos' },
            { val: 'ok', label: '✅ Stock OK' },
            { val: 'bajo', label: '⚠️ Stock Bajo' },
            { val: 'sin', label: '🔴 Sin Stock' },
          ].map(f => (
            <button key={f.val} onClick={() => setFiltro(f.val)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filtro === f.val ? 'bg-[#22c55e] text-[#0a0f0a]' : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-20 text-[#86efac]">Cargando inventario...</div>
        ) : (
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2e1a]">
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Producto</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4 hidden md:table-cell">Categoría</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Stock actual</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4 hidden sm:table-cell">Mínimo</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Nivel</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((p) => {
                    const porcentaje = Math.min((p.stock / Math.max(p.stock_minimo * 2, 1)) * 100, 100)
                    const estado = p.stock === 0 ? 'sin' : p.stock <= p.stock_minimo ? 'bajo' : 'ok'
                    return (
                      <tr key={p.id} className="border-b border-[#1a2e1a] hover:bg-[#162016] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{p.icono}</span>
                            <span className="text-[#f0fdf4] text-sm">{p.nombre}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-[#86efac] text-sm">{p.categorias?.nombre}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[#f0fdf4] font-bold">{p.stock}</span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-[#86efac] text-sm">{p.stock_minimo}</span>
                        </td>
                        <td className="px-5 py-4 w-32">
                          <div className="w-full bg-[#0a0f0a] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                estado === 'ok' ? 'bg-[#22c55e]' :
                                estado === 'bajo' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            estado === 'ok' ? 'bg-green-900 text-green-400' :
                            estado === 'bajo' ? 'bg-yellow-900 text-yellow-400' :
                            'bg-red-900 text-red-400'
                          }`}>
                            {estado === 'ok' ? 'OK' : estado === 'bajo' ? 'Bajo' : 'Agotado'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
