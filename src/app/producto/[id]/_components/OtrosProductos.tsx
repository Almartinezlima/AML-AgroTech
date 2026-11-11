'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LuArrowRight } from 'react-icons/lu'
import TarjetaProducto from '@/app/catalogo/_components/TarjetaProducto'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Producto } from '@/types/comercio'

// "Otros productos de la categoría" al pie de la ficha (si falla, simplemente no aparece)
export default function OtrosProductos({ productoId, categoria }: { productoId: string; categoria?: string | null }) {
  const { datos } = useDatosApi<Producto[]>(categoria ? '/api/productos' : null)
  const { agregarItem } = useCarrito()
  const [agregados, setAgregados] = useState<string[]>([])

  const otros = (datos ?? [])
    .filter((p) => p.categorias?.nombre === categoria && p.id !== productoId && p.stock > 0)
    .slice(0, 4)

  if (!categoria || otros.length === 0) return null

  const agregar = (producto: Producto) => {
    agregarItem(productoParaCarrito(producto))
    setAgregados((prev) => [...prev, producto.id])
    setTimeout(() => setAgregados((prev) => prev.filter((id) => id !== producto.id)), 1500)
  }

  return (
    <section className="mt-14" aria-labelledby="otros-titulo">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 id="otros-titulo" className="font-titulo text-2xl font-bold tracking-tight text-texto">Otros productos de {categoria}</h2>
        <Link href={`/catalogo?categoria=${encodeURIComponent(categoria)}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:text-acento-hover">
          Ver todos <LuArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {otros.map((p) => (
          <TarjetaProducto key={p.id} producto={p} agregado={agregados.includes(p.id)} onAgregar={agregar} compacta />
        ))}
      </div>
    </section>
  )
}
