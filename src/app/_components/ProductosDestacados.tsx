'use client'
import { useState } from 'react'
import TarjetaProducto from '@/app/catalogo/_components/TarjetaProducto'
import { BloqueCarga } from '@/components/ui/Estados'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Producto } from '@/types/comercio'

// Muestra productos reales con stock. Si falla, la portada sigue funcionando sin esta sección.
export default function ProductosDestacados() {
  const { datos, cargando } = useDatosApi<Producto[]>('/api/productos')
  const { agregarItem } = useCarrito()
  const [agregados, setAgregados] = useState<string[]>([])

  const agregar = (producto: Producto) => {
    agregarItem(productoParaCarrito(producto))
    setAgregados((prev) => [...prev, producto.id])
    setTimeout(() => setAgregados((prev) => prev.filter((id) => id !== producto.id)), 1500)
  }

  if (cargando) return <BloqueCarga filas={2} alto="h-40" />

  const destacados = (datos ?? []).filter((p) => p.stock > 0).sort((a, b) => b.stock - a.stock).slice(0, 4)

  if (destacados.length === 0) {
    return <p className="text-[#86efac] text-center">Visita el catálogo para ver todos los productos.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {destacados.map((producto) => (
        <TarjetaProducto key={producto.id} producto={producto} agregado={agregados.includes(producto.id)} onAgregar={agregar} />
      ))}
    </div>
  )
}
