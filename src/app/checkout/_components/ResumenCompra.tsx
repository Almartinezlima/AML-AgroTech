import { LuChevronDown } from 'react-icons/lu'
import ImagenProducto from '@/components/ImagenProducto'
import type { ItemCarrito } from '@/context/CarritoContext'
import { formatoBs } from '@/lib/utils'
import type { Cotizacion, ZonaEnvio } from '@/types/comercio'

interface ResumenCompraProps {
  items: ItemCarrito[]
  zona?: ZonaEnvio
  // Montos calculados por el servidor (paso Pago); antes se muestra el estimado del carrito
  cotizacion?: Cotizacion
}

function montos({ items, zona, cotizacion }: ResumenCompraProps) {
  if (cotizacion) return { subtotal: cotizacion.subtotal, envio: cotizacion.costo_envio as number | null, total: cotizacion.total }
  const subtotal = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0)
  const envio = zona?.costo ?? null
  return { subtotal, envio, total: subtotal + (envio ?? 0) }
}

function Contenido(props: ResumenCompraProps) {
  const { items } = props
  const { subtotal, envio, total } = montos(props)

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <ImagenProducto nombre={i.nombre} imagen={i.imagen_url} categoria={i.categoria} className="h-14 w-14 shrink-0 rounded-xl border border-borde" sizes="56px" />
            <span className="min-w-0 flex-1 text-sm text-texto">
              <span className="line-clamp-2">{i.nombre}</span>
              <span className="text-texto-2">× {i.cantidad}</span>
            </span>
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-texto">{formatoBs(i.precio * i.cantidad)}</span>
          </li>
        ))}
      </ul>
      <dl data-montos className="mt-4 flex flex-col gap-2 border-t border-borde pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-texto-2">Subtotal</dt><dd data-monto="subtotal" className="tabular-nums text-texto">{formatoBs(subtotal)}</dd></div>
        <div className="flex justify-between gap-3">
          <dt className="text-texto-2">Envío</dt>
          <dd data-monto="envio" className="text-right tabular-nums text-texto">{envio === null ? 'Elige la zona' : envio === 0 ? 'Gratis' : formatoBs(envio)}</dd>
        </div>
        <div className="flex justify-between border-t border-borde pt-3 text-lg font-bold">
          <dt className="text-texto">Total</dt><dd data-monto="total" className="tabular-nums text-acento">{formatoBs(total)}</dd>
        </div>
      </dl>
    </>
  )
}

// Escritorio: tarjeta fija a la derecha
export function ResumenLateral(props: ResumenCompraProps) {
  return (
    <aside aria-label="Resumen de tu compra" className="hidden h-fit rounded-2xl border border-borde bg-tarjeta p-5 shadow-tarjeta lg:sticky lg:top-24 lg:block">
      <h2 className="mb-4 font-titulo text-xl font-bold text-texto">Tu compra</h2>
      <Contenido {...props} />
    </aside>
  )
}

// Celular: resumen plegable arriba del formulario
export function ResumenPlegable(props: ResumenCompraProps) {
  const { total } = montos(props)
  return (
    <details className="group mb-5 rounded-2xl border border-borde bg-tarjeta shadow-tarjeta lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-texto">
        <span className="min-w-0">Tu compra · {props.items.length} producto{props.items.length === 1 ? '' : 's'}</span>
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap tabular-nums text-acento">
          {formatoBs(total)}
          <LuChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-borde p-4"><Contenido {...props} /></div>
    </details>
  )
}
