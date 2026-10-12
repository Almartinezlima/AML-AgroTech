'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useCarrito } from '@/context/CarritoContext'

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
  unidad: string
  icono: string
  categoria_id: string
  categorias: { nombre: string; icono: string }
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenar, setOrdenar] = useState('nombre')
  const [cargando, setCargando] = useState(true)
  const [agregados, setAgregados] = useState<string[]>([])
  const { agregarItem } = useCarrito()
  const supabase = createClient()

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nombre, icono')
        .eq('activo', true)
        .order('nombre')

      const { data: prods } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, stock, unidad, icono, categoria_id, categorias(nombre, icono)')
        .eq('activo', true)
        .order('nombre')

      if (cats) setCategorias(cats)
      if (prods) setProductos(prods as unknown as Producto[])
      setCargando(false)
    }
    cargarDatos()
  }, [])

  const productosFiltrados = productos
    .filter(p => categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva)
    .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (ordenar === 'precio-asc') return a.precio - b.precio
      if (ordenar === 'precio-desc') return b.precio - a.precio
      return a.nombre.localeCompare(b.nombre)
    })

  const handleAgregar = (producto: Producto) => {
    agregarItem({
      id: producto.id as unknown as number,
      nombre: producto.nombre,
      precio: producto.precio,
      categoria: producto.categorias?.nombre || '',
      icono: producto.icono,
      unidad: producto.unidad,
    })
    setAgregados(prev => [...prev, producto.id])
    setTimeout(() => setAgregados(prev => prev.filter(id => id !== producto.id)), 1500)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌱</div>
          <p className="text-[#86efac]">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Catálogo de Productos</h1>
          <p className="text-[#86efac]">{productosFiltrados.length} productos disponibles</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 bg-[#111811] border border-[#1a2e1a] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 focus:outline-none focus:border-[#22c55e] transition-colors"
          />
          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
            className="bg-[#111811] border border-[#1a2e1a] text-[#86efac] rounded-xl px-4 py-3 focus:outline-none focus:border-[#22c55e] transition-colors"
          >
            <option value="nombre">Ordenar: A-Z</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setCategoriaActiva('Todos')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              categoriaActiva === 'Todos'
                ? 'bg-[#22c55e] text-[#0a0f0a]'
                : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.nombre)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                categoriaActiva === cat.nombre
                  ? 'bg-[#22c55e] text-[#0a0f0a]'
                  : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'
              }`}
            >
              {cat.icono} {cat.nombre}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productosFiltrados.map((producto) => (
            <div key={producto.id} className="bg-[#111811] border border-[#1a2e1a] hover:border-[#22c55e] rounded-xl overflow-hidden transition-all hover:bg-[#162016] group">
              <div className="bg-[#162016] h-40 flex items-center justify-center text-5xl">
                {producto.icono}
              </div>
              <div className="p-4">
                <span className="text-[#22c55e] text-xs font-medium">{producto.categorias?.nombre}</span>
                <h3 className="text-[#f0fdf4] font-semibold mt-1 mb-1 group-hover:text-[#22c55e] transition-colors text-sm">{producto.nombre}</h3>
                <p className="text-[#86efac] text-xs mb-3 line-clamp-2">{producto.descripcion}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#22c55e] font-bold">Bs. {producto.precio.toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    producto.stock > 50 ? 'bg-[#162016] text-[#22c55e]' :
                    producto.stock > 20 ? 'bg-yellow-900 text-yellow-400' :
                    'bg-red-900 text-red-400'
                  }`}>
                    Stock: {producto.stock}
                  </span>
                </div>
                <p className="text-[#86efac] text-xs mb-3">Unidad: {producto.unidad}</p>
                <button
                  onClick={() => handleAgregar(producto)}
                  disabled={producto.stock === 0}
                  className={`w-full font-semibold py-2 rounded-lg transition-all text-sm ${
                    agregados.includes(producto.id)
                      ? 'bg-[#16a34a] text-[#f0fdf4]'
                      : producto.stock === 0
                      ? 'bg-[#1a2e1a] text-[#86efac] cursor-not-allowed'
                      : 'bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a]'
                  }`}
                >
                  {agregados.includes(producto.id) ? '✅ Agregado' : producto.stock === 0 ? 'Sin stock' : '🛒 Agregar al carrito'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {productosFiltrados.length === 0 && !cargando && (
          <div className="text-center py-20">
            <span className="text-6xl">🔍</span>
            <p className="text-[#86efac] mt-4 text-lg">No se encontraron productos</p>
            <button onClick={() => { setBusqueda(''); setCategoriaActiva('Todos') }} className="mt-4 text-[#22c55e] hover:underline">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
