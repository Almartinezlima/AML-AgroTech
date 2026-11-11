'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LuArrowLeft, LuMinus, LuPlus, LuShoppingCart, LuTrash2, LuUndo2 } from 'react-icons/lu'
import EtiquetaCategoria from '@/components/EtiquetaCategoria'
import ImagenProducto from '@/components/ImagenProducto'
import { BloqueCarga, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, clasePagina, claseTituloPagina } from '@/components/ui/estilos'
import { useAuth } from '@/context/AuthContext'
import { type ItemCarrito, useCarrito } from '@/context/CarritoContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { ZonaEnvio } from '@/types/comercio'

const claseCantidad = 'grid h-11 w-11 place-items-center rounded-xl border border-borde bg-tarjeta text-texto transition hover:border-acento disabled:opacity-40'
const SEGUNDOS_DESHACER = 6

export default function CarritoPage() {
  const { items, actualizarCantidad, eliminarItem, agregarItem, total, listo } = useCarrito()
  const { user, cargando: cargandoSesion } = useAuth()
  const zonas = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')
  // Último producto quitado, para poder deshacer
  const [quitado, setQuitado] = useState<ItemCarrito | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const quitar = (item: ItemCarrito) => {
    eliminarItem(item.id)
    setQuitado(item)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setQuitado(null), SEGUNDOS_DESHACER * 1000)
  }

  const deshacer = () => {
    if (!quitado) return
    const { cantidad, ...producto } = quitado
    agregarItem(producto, cantidad)
    setQuitado(null)
  }

  const costos = (zonas.datos ?? []).map((z) => z.costo)
  const envioMin = costos.length ? Math.min(...costos) : null
  const envioMax = costos.length ? Math.max(...costos) : null

  const avisoDeshacer = quitado && (
    <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-texto px-4 py-3 text-white shadow-2xl sm:bottom-6">
      <span className="min-w-0 truncate text-sm">Quitaste «{quitado.nombre}»</span>
      <button onClick={deshacer} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 font-semibold text-[#86efac] hover:bg-white/10">
        <LuUndo2 className="h-4 w-4" aria-hidden="true" /> Deshacer
      </button>
    </div>
  )

  if (!listo) {
    return <div className={clasePagina}><div className="max-w-6xl mx-auto"><BloqueCarga filas={3} /></div></div>
  }

  if (items.length === 0) {
    return (
      <div className={clasePagina}>
        <div className="max-w-3xl mx-auto">
          <BloqueVacio icono={LuShoppingCart} mensaje="Tu carrito está vacío">
            <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
          </BloqueVacio>
        </div>
        {avisoDeshacer}
      </div>
    )
  }

  const unidades = items.reduce((suma, i) => suma + i.cantidad, 0)

  return (
    <div className={clasePagina}>
      <div className="max-w-6xl mx-auto">
        <h1 className={claseTituloPagina}>Mi carrito</h1>
        <p className="text-texto-2 mt-2 mb-8">
          {items.length} producto{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''} · {unidades} unidad{unidades !== 1 ? 'es' : ''}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ul className="lg:col-span-2 flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-4 rounded-2xl border border-borde bg-tarjeta p-4 shadow-sm sm:p-5">
                <ImagenProducto nombre={item.nombre} imagen={item.imagen_url} categoria={item.categoria}
                  className="h-20 w-20 shrink-0 rounded-xl border border-borde sm:h-24 sm:w-24" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <EtiquetaCategoria categoria={item.categoria} />
                  <h3 className="mt-1.5 font-semibold text-texto break-words">{item.nombre}</h3>
                  <p className="text-texto-2 text-sm">{formatoBs(item.precio)} por {item.unidad} · Disponibles: {item.stock}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button aria-label={`Quitar uno de ${item.nombre}`} disabled={item.cantidad <= 1} onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className={claseCantidad}>
                        <LuMinus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-10 text-center text-lg font-semibold tabular-nums text-texto" aria-label={`Cantidad: ${item.cantidad}`}>{item.cantidad}</span>
                      <button aria-label={`Agregar uno de ${item.nombre}`} disabled={item.cantidad >= item.stock} onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className={claseCantidad}>
                        <LuPlus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-titulo text-lg font-bold tabular-nums text-texto">{formatoBs(item.precio * item.cantidad)}</span>
                      <button onClick={() => quitar(item)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">
                        <LuTrash2 className="h-4 w-4" aria-hidden="true" /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            <li>
              <Link href="/catalogo" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:text-acento-hover">
                <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Seguir comprando
              </Link>
            </li>
          </ul>

          <aside className="h-fit rounded-2xl border border-borde bg-tarjeta p-6 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-titulo text-xl font-bold text-texto">Resumen</h2>
            <div className="mt-4 flex justify-between text-lg font-bold">
              <span className="text-texto">Subtotal</span>
              <span className="tabular-nums text-texto">{formatoBs(total)}</span>
            </div>
            <p className="mt-2 text-sm text-texto-2">
              {envioMin !== null && envioMax !== null
                ? `Envío: ${envioMin === 0 ? 'gratis si recoges en Villa Charcas' : `desde ${formatoBs(envioMin)}`}, hasta ${formatoBs(envioMax)} según la zona.`
                : 'El costo de envío se calcula al elegir la zona de entrega.'}
            </p>

            {cargandoSesion || user ? (
              <Link href="/checkout" className={`${claseBotonPrimario} mt-6 w-full text-lg`}>Continuar con la compra</Link>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <p className="rounded-xl bg-tarjeta-hover px-4 py-3 text-sm text-texto">
                  Para terminar la compra necesitas una cuenta. Tu carrito se guarda.
                </p>
                <Link href="/auth/login?siguiente=%2Fcheckout" className={`${claseBotonPrimario} w-full text-lg`}>Iniciar sesión y comprar</Link>
                <Link href="/auth/registro?siguiente=%2Fcheckout" className={`${claseBotonSecundario} w-full`}>Crear cuenta gratis</Link>
              </div>
            )}
          </aside>
        </div>
      </div>
      {avisoDeshacer}
    </div>
  )
}
