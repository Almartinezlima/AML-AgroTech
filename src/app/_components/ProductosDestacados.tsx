'use client'
import { useState } from 'react'
import TarjetaProducto from '@/app/catalogo/_components/TarjetaProducto'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Producto } from '@/types/comercio'

// Vitrina de la portada: productos insignia de cada categoría (por SKU).
// Si alguno no existe o se agota, se completa con uno por categoría de los de más stock.
// Si la API falla, la portada sigue funcionando sin esta sección.
const VITRINA = ['HER-004', 'SEM-003', 'RIE-001', 'AGR-011']

function elegirDestacados(productos: Producto[], cantidad = 4) {
  const conStock = productos.filter((p) => p.stock > 0).sort((a, b) => b.stock - a.stock)
  const elegidos = VITRINA
    .map((sku) => conStock.find((p) => p.sku === sku))
    .filter((p): p is Producto => Boolean(p))
  const vistas = new Set<string>(elegidos.map((p) => p.categorias?.nombre ?? ''))
  for (const p of conStock) {
    if (elegidos.length >= cantidad) break
    if (elegidos.includes(p)) continue
    const categoria = p.categorias?.nombre ?? ''
    if (!vistas.has(categoria)) {
      vistas.add(categoria)
      elegidos.push(p)
    }
  }
  return elegidos.slice(0, cantidad)
}

export default function ProductosDestacados() {
  const { datos, cargando } = useDatosApi<Producto[]>('/api/productos')
  const { agregarItem } = useCarrito()
  const [agregados, setAgregados] = useState<string[]>([])

  const agregar = (producto: Producto) => {
    agregarItem(productoParaCarrito(producto))
    setAgregados((prev) => [...prev, producto.id])
    setTimeout(() => setAgregados((prev) => prev.filter((id) => id !== producto.id)), 1500)
  }

  if (cargando) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="status" aria-label="Cargando">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="esqueleto h-80 rounded-2xl border border-borde lg:h-[26rem]" />)}
      </div>
    )
  }

  const destacados = elegirDestacados(datos ?? [])

  if (destacados.length === 0) {
    return <p className="text-texto-2">Visita el catálogo para ver todos los productos.</p>
  }

  return (
    // En celular, carrusel horizontal (se desliza con el dedo); desde tablet, grilla
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
      role="list" aria-label="Productos destacados">
      {destacados.map((producto) => (
        <div key={producto.id} role="listitem" className="w-[72%] shrink-0 snap-start sm:w-auto">
          <TarjetaProducto producto={producto} agregado={agregados.includes(producto.id)} onAgregar={agregar} compacta />
        </div>
      ))}
    </div>
  )
}
