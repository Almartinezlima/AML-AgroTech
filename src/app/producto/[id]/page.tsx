'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LuArrowLeft, LuCheck, LuMinus, LuPackageX, LuPlus, LuShieldCheck, LuShoppingCart, LuTruck } from 'react-icons/lu'
import EtiquetaCategoria from '@/components/EtiquetaCategoria'
import ImagenProducto from '@/components/ImagenProducto'
import { BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, clasePagina } from '@/components/ui/estilos'
import OtrosProductos from './_components/OtrosProductos'
import { productoParaCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { estiloCategoria } from '@/lib/categorias'
import { INFO_NIVEL, nivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

const claseCantidad = 'grid h-11 w-11 place-items-center rounded-xl border border-borde bg-tarjeta-hover text-texto transition hover:border-acento disabled:opacity-40'

export default function ProductoPage() {
  const { id } = useParams<{ id: string }>()
  const { datos: producto, cargando, error, estadoError, recargar } = useDatosApi<Producto>(`/api/productos/${id}`)
  const { agregarItem } = useCarrito()
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="max-w-6xl mx-auto">{contenido}</div></div>
  )

  if (cargando) {
    return envoltura(
      <div className="grid gap-8 md:grid-cols-2" role="status" aria-label="Cargando">
        <div className="esqueleto aspect-square rounded-3xl border border-borde" />
        <div className="flex flex-col gap-4">
          <div className="esqueleto h-8 w-32 rounded-full" />
          <div className="esqueleto h-12 rounded-xl" />
          <div className="esqueleto h-10 w-48 rounded-xl" />
          <div className="esqueleto h-24 rounded-xl" />
        </div>
      </div>
    )
  }
  // Id inválido o producto inexistente: no tiene sentido "Reintentar"
  if (estadoError !== null && [400, 404, 422].includes(estadoError)) {
    return envoltura(
      <BloqueVacio icono={LuPackageX} mensaje="No encontramos este producto. Puede que ya no esté a la venta.">
        <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
      </BloqueVacio>
    )
  }
  if (error || !producto) {
    return envoltura(<BloqueError mensaje={error || 'El producto no existe.'} onReintentar={() => void recargar()} />)
  }

  const agotado = producto.stock === 0
  const nivel = INFO_NIVEL[nivelStock(producto.stock, producto.stock_minimo)]
  const categoria = producto.categorias?.nombre
  const color = estiloCategoria(categoria).color

  const agregar = () => {
    agregarItem(productoParaCarrito(producto), cantidad)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 1500)
  }

  return envoltura(
    <>
      <Link href="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-texto-2 hover:text-acento">
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al catálogo
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-2 lg:gap-12">
        <div className="relative overflow-hidden rounded-3xl border border-borde shadow-2xl shadow-black/10">
          <ImagenProducto
            nombre={producto.nombre}
            imagen={producto.imagen_url}
            categoria={categoria}
            prioridad
            className="aspect-square"
            sizes="(max-width: 768px) 100vw, 560px"
          />
          <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: color }} aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <EtiquetaCategoria categoria={categoria} />
            <h1 className="mt-3 font-titulo text-3xl font-bold tracking-tight text-texto sm:text-4xl">{producto.nombre}</h1>
            {producto.sku && <p className="mt-1 text-xs text-texto-2">Código: {producto.sku}</p>}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-titulo text-4xl font-bold tabular-nums tracking-tight text-acento">{formatoBs(producto.precio)}</p>
            <span className="text-texto-2">por {producto.unidad}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Insignia info={nivel} />
            <span className="text-sm text-texto-2">{agotado ? 'Sin unidades por ahora' : `${producto.stock} disponibles`}</span>
          </div>

          {producto.descripcion && <p className="max-w-prose leading-relaxed text-texto-2">{producto.descripcion}</p>}

          {!agotado && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-texto-2">Cantidad</span>
              <button aria-label="Quitar uno" disabled={cantidad <= 1} onClick={() => setCantidad((c) => c - 1)} className={claseCantidad}>
                <LuMinus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-10 text-center text-lg font-semibold tabular-nums text-texto" aria-live="polite">{cantidad}</span>
              <button aria-label="Agregar uno" disabled={cantidad >= producto.stock} onClick={() => setCantidad((c) => c + 1)} className={claseCantidad}>
                <LuPlus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <button onClick={agregar} disabled={agotado} className={`${claseBotonPrimario} w-full text-lg shadow-lg shadow-acento/20`}>
            {agregado ? (
              <><LuCheck className="h-5 w-5" aria-hidden="true" /> Agregado</>
            ) : agotado ? 'Sin stock' : (
              <><LuShoppingCart className="h-5 w-5" aria-hidden="true" /> Agregar al carrito</>
            )}
          </button>

          <ul className="grid gap-3 rounded-2xl border border-borde bg-tarjeta p-4 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-3">
              <LuTruck className="mt-0.5 h-5 w-5 shrink-0 text-trigo" aria-hidden="true" />
              <span className="text-texto-2"><span className="block font-semibold text-texto">Envío desde Villa Charcas</span>En el pueblo Bs. 10 · Culpina e Incahuasi Bs. 10 · Sucre Bs. 15 (recojo en la terminal)</span>
            </li>
            <li className="flex items-start gap-3">
              <LuShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-trigo" aria-hidden="true" />
              <span className="text-texto-2"><span className="block font-semibold text-texto">Pago seguro</span>QR, transferencia o contra entrega en Villa Charcas</span>
            </li>
          </ul>
        </div>
      </div>
      <OtrosProductos productoId={producto.id} categoria={categoria} />
    </>
  )
}
