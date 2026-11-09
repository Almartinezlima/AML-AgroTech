'use client'
import { useEffect, useMemo, useState } from 'react'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Categoria, Producto } from '@/types/comercio'
import TarjetaProducto from './_components/TarjetaProducto'

const claseFiltro = (activo: boolean) =>
  `px-4 py-2 rounded-full text-sm font-medium transition-all ${
    activo ? 'bg-[#22c55e] text-[#0a0f0a]' : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'
  }`

export default function CatalogoPage() {
  const productos = useDatosApi<Producto[]>('/api/productos')
  const categorias = useDatosApi<Categoria[]>('/api/categorias')
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenar, setOrdenar] = useState('nombre')
  const [agregados, setAgregados] = useState<string[]>([])
  const { agregarItem } = useCarrito()

  // Los enlaces de categorías de la portada llegan como ?categoria=
  useEffect(() => {
    const categoria = new URLSearchParams(window.location.search).get('categoria')
    if (categoria) setCategoriaActiva(categoria)
  }, [])

  const filtrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return (productos.datos ?? [])
      .filter(p => categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva)
      .filter(p => p.nombre.toLowerCase().includes(termino))
      .sort((a, b) => {
        if (ordenar === 'precio-asc') return a.precio - b.precio
        if (ordenar === 'precio-desc') return b.precio - a.precio
        return a.nombre.localeCompare(b.nombre)
      })
  }, [productos.datos, categoriaActiva, busqueda, ordenar])

  const handleAgregar = (producto: Producto) => {
    agregarItem(productoParaCarrito(producto))
    setAgregados(prev => [...prev, producto.id])
    setTimeout(() => setAgregados(prev => prev.filter(id => id !== producto.id)), 1500)
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Catálogo de Productos</h1>
          <p className="text-[#86efac]">{filtrados.length} productos disponibles</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar producto..."
            aria-label="Buscar producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 min-w-0 bg-[#111811] border border-[#1a2e1a] text-[#f0fdf4] placeholder-[#86efac] rounded-xl px-4 py-3 focus:outline-none focus:border-[#22c55e] transition-colors"
          />
          <select
            value={ordenar}
            aria-label="Ordenar productos"
            onChange={(e) => setOrdenar(e.target.value)}
            className="bg-[#111811] border border-[#1a2e1a] text-[#86efac] rounded-xl px-4 py-3 focus:outline-none focus:border-[#22c55e] transition-colors"
          >
            <option value="nombre">Ordenar: A-Z</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setCategoriaActiva('Todos')} className={claseFiltro(categoriaActiva === 'Todos')}>Todos</button>
          {(categorias.datos ?? []).map((cat) => (
            <button key={cat.id} onClick={() => setCategoriaActiva(cat.nombre)} className={claseFiltro(categoriaActiva === cat.nombre)}>
              {cat.icono} {cat.nombre}
            </button>
          ))}
        </div>

        {productos.cargando ? (
          <BloqueCarga filas={6} alto="h-40" />
        ) : productos.error ? (
          <BloqueError mensaje={productos.error} onReintentar={() => void productos.recargar()} />
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl">🔍</span>
            <p className="text-[#86efac] mt-4 text-lg">No se encontraron productos</p>
            <button onClick={() => { setBusqueda(''); setCategoriaActiva('Todos') }} className="mt-4 text-[#22c55e] hover:underline">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtrados.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} agregado={agregados.includes(producto.id)} onAgregar={handleAgregar} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
