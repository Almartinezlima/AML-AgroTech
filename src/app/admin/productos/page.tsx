'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Categoria {
  id: string
  nombre: string
  icono: string
}

interface Producto {
  id: string
  nombre: string
  descripcion: string
  precio: number
  stock: number
  stock_minimo: number
  unidad: string
  icono: string
  activo: boolean
  categorias: { nombre: string }
  categoria_id: string
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre: '', descripcion: '', precio: '', stock: '',
    stock_minimo: '10', unidad: 'unidad', categoria_id: '', icono: '📦'
  })
  const supabase = createClient()

  const cargarDatos = async () => {
    const { data: prods } = await supabase
      .from('productos')
      .select('id, nombre, descripcion, precio, stock, stock_minimo, unidad, icono, activo, categoria_id, categorias(nombre)')
      .order('nombre')
    const { data: cats } = await supabase
      .from('categorias')
      .select('id, nombre, icono')
      .eq('activo', true)
    if (prods) setProductos(prods as unknown as Producto[])
    if (cats) setCategorias(cats)
    setCargando(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    await supabase.from('productos').insert({
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock),
      stock_minimo: parseInt(form.stock_minimo),
      unidad: form.unidad,
      categoria_id: form.categoria_id,
      icono: form.icono,
    })
    setModalAbierto(false)
    setForm({ nombre: '', descripcion: '', precio: '', stock: '', stock_minimo: '10', unidad: 'unidad', categoria_id: '', icono: '📦' })
    setGuardando(false)
    await cargarDatos()
  }

  const handleDesactivar = async (id: string, activo: boolean) => {
    await supabase.from('productos').update({ activo: !activo }).eq('id', id)
    await cargarDatos()
  }

  const iconosPorCategoria: Record<string, string> = {
    'Agroquímicos': '🧪', 'Riego': '💧', 'Cañerías': '🔧', 'Herramientas': '⚒️', 'Semillas': '🌱'
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f0fdf4]">Gestión de Productos</h1>
            <p className="text-[#86efac] mt-1">{productos.length} productos registrados</p>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold px-6 py-3 rounded-xl transition-colors"
          >
            + Agregar producto
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-[#111811] border border-[#1a2e1a] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 focus:outline-none focus:border-[#22c55e] transition-colors mb-6"
        />

        {cargando ? (
          <div className="text-center py-20 text-[#86efac]">Cargando productos...</div>
        ) : (
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2e1a]">
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Producto</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4 hidden md:table-cell">Categoría</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Precio</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Stock</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4 hidden sm:table-cell">Unidad</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Estado</th>
                    <th className="text-left text-[#86efac] text-xs px-5 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-[#1a2e1a] hover:bg-[#162016] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p.icono}</span>
                          <span className="text-[#f0fdf4] text-sm font-medium">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-[#86efac] text-sm">{p.categorias?.nombre}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[#22c55e] font-bold text-sm">Bs. {p.precio.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          p.stock > p.stock_minimo ? 'bg-[#162016] text-[#22c55e]' :
                          p.stock > 0 ? 'bg-yellow-900 text-yellow-400' :
                          'bg-red-900 text-red-400'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-[#86efac] text-xs">{p.unidad}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.activo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDesactivar(p.id, p.activo)}
                          className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                            p.activo
                              ? 'bg-red-900 hover:bg-red-800 text-red-300'
                              : 'bg-green-900 hover:bg-green-800 text-green-300'
                          }`}
                        >
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal agregar producto */}
        {modalAbierto && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
            <div className="bg-[#111811] border border-[#1a2e1a] rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[#f0fdf4] mb-6">Agregar nuevo producto</h2>
              <form onSubmit={handleGuardar} className="flex flex-col gap-4">

                <div>
                  <label className="text-[#86efac] text-sm mb-2 block">Categoría</label>
                  <select
                    value={form.categoria_id}
                    onChange={(e) => {
                      const cat = categorias.find(c => c.id === e.target.value)
                      setForm(f => ({
                        ...f,
                        categoria_id: e.target.value,
                        icono: cat ? (iconosPorCategoria[cat.nombre] || '📦') : '📦'
                      }))
                    }}
                    required
                    className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] rounded-xl px-4 py-3 outline-none"
                  >
                    <option value="">Selecciona una categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#86efac] text-sm mb-2 block">Nombre del producto</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Urea 46% N" required
                    className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none" />
                </div>

                <div>
                  <label className="text-[#86efac] text-sm mb-2 block">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripción del producto..." rows={3}
                    className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#86efac] text-sm mb-2 block">Precio (Bs.)</label>
                    <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                      placeholder="0.00" required
                      className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="text-[#86efac] text-sm mb-2 block">Stock inicial</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                      placeholder="0" required
                      className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#86efac] text-sm mb-2 block">Stock mínimo</label>
                    <input type="number" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                      className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="text-[#86efac] text-sm mb-2 block">Unidad de venta</label>
                    <input type="text" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}
                      placeholder="Ej: litro, kilo, unidad"
                      className="w-full bg-[#162016] border border-[#1a2e1a] focus:border-[#22c55e] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 outline-none" />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setModalAbierto(false)}
                    className="flex-1 border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e] py-3 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando}
                    className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-[#0a0f0a] font-bold py-3 rounded-xl transition-colors">
                    {guardando ? 'Guardando...' : 'Guardar producto'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
