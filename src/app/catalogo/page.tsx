'use client'
import { useEffect, useMemo, useState } from 'react'
import { BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Categoria, Producto } from '@/types/comercio'
import TarjetaProducto from './_components/TarjetaProducto'
import { LuSearch, LuSearchX } from 'react-icons/lu'
import { estiloCategoria } from '@/lib/categorias'
import { coincideBusqueda } from '@/lib/ecommerce/busqueda'
import { claseBotonSecundario, clasePagina, claseTituloPagina } from '@/components/ui/estilos'

const claseFiltro = (activo: boolean) =>
  `inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-full text-sm font-semibold transition ${
    activo ? 'bg-acento text-white shadow-sm' : 'bg-tarjeta border border-borde text-texto hover:border-acento'
  }`

const ORDENES = ['nombre', 'precio-asc', 'precio-desc']

export default function CatalogoPage() {
  const productos = useDatosApi<Producto[]>('/api/productos')
  const categorias = useDatosApi<Categoria[]>('/api/categorias')
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenar, setOrdenar] = useState('nombre')
  const [agregados, setAgregados] = useState<string[]>([])
  const { agregarItem } = useCarrito()

  // Filtro, orden y búsqueda viven en la URL: sobreviven a recargar y se pueden compartir
  const [urlLeida, setUrlLeida] = useState(false)
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search)
    const categoria = parametros.get('categoria')
    const termino = parametros.get('q')
    const orden = parametros.get('orden')
    if (categoria) setCategoriaActiva(categoria)
    if (termino) setBusqueda(termino.slice(0, 80))
    if (orden && ORDENES.includes(orden)) setOrdenar(orden)
    setUrlLeida(true)
  }, [])

  useEffect(() => {
    if (!urlLeida) return
    const parametros = new URLSearchParams()
    if (busqueda.trim()) parametros.set('q', busqueda.trim())
    if (categoriaActiva !== 'Todos') parametros.set('categoria', categoriaActiva)
    if (ordenar !== 'nombre') parametros.set('orden', ordenar)
    const consulta = parametros.toString()
    window.history.replaceState(window.history.state, '', `/catalogo${consulta ? `?${consulta}` : ''}`)
  }, [urlLeida, busqueda, categoriaActiva, ordenar])

  const filtrados = useMemo(() => {
    return (productos.datos ?? [])
      .filter(p => categoriaActiva === 'Todos' || p.categorias?.nombre === categoriaActiva)
      .filter(p => coincideBusqueda(p, busqueda))
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
    <div className={clasePagina}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={claseTituloPagina}>Catálogo de productos</h1>
          <p className="text-texto-2 mt-2" aria-live="polite">
            {productos.cargando
              ? 'Cargando productos…'
              : productos.error
                ? 'No pudimos cargar los productos en este momento.'
                : `${filtrados.length} producto${filtrados.length === 1 ? '' : 's'} con precios en bolivianos`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 min-w-0">
            <LuSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-texto-2" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar: urea, papa, aspersor…"
              aria-label="Buscar producto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full min-h-12 bg-tarjeta border border-borde text-texto rounded-xl pl-12 pr-4 py-3 outline-none focus:border-acento focus:ring-2 focus:ring-acento/25 transition-colors"
            />
          </div>
          <select
            value={ordenar}
            aria-label="Ordenar productos"
            onChange={(e) => setOrdenar(e.target.value)}
            className="min-h-12 bg-tarjeta border border-borde text-texto rounded-xl px-4 py-3 outline-none focus:border-acento transition-colors"
          >
            <option value="nombre">Ordenar: A-Z</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setCategoriaActiva('Todos')} className={claseFiltro(categoriaActiva === 'Todos')} aria-pressed={categoriaActiva === 'Todos'}>Todos</button>
          {(categorias.datos ?? []).map((cat) => (
            <button key={cat.id} onClick={() => setCategoriaActiva(cat.nombre)} className={claseFiltro(categoriaActiva === cat.nombre)} aria-pressed={categoriaActiva === cat.nombre}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: estiloCategoria(cat.nombre).color }} aria-hidden="true" /> {cat.nombre}
            </button>
          ))}
        </div>

        {productos.cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="status" aria-label="Cargando">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="esqueleto h-[30rem] rounded-2xl border border-borde" />)}
          </div>
        ) : productos.error ? (
          <BloqueError mensaje={productos.error} onReintentar={() => void productos.recargar()} />
        ) : filtrados.length === 0 ? (
          <BloqueVacio icono={LuSearchX} mensaje="No encontramos productos con esa búsqueda">
            <button onClick={() => { setBusqueda(''); setCategoriaActiva('Todos') }} className={claseBotonSecundario}>
              Limpiar filtros
            </button>
          </BloqueVacio>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtrados.map((producto, i) => (
              <TarjetaProducto key={producto.id} producto={producto} agregado={agregados.includes(producto.id)} onAgregar={handleAgregar} prioridad={i < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
