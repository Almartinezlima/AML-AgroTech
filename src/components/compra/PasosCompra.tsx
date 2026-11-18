import Link from 'next/link'
import { LuCheck } from 'react-icons/lu'

// Barra de pasos de la compra (fase 4, 9E): el cliente siempre sabe en qué paso está.
// Carrito → Datos y pago (confirmar) → Pagar (QR y foto del pago) → Listo. El carrito se
// puede tocar para volver mientras no se confirmó el pedido.
export const PASOS_COMPRA = ['Carrito', 'Datos y pago', 'Pagar', 'Listo'] as const
export type PasoCompra = 0 | 1 | 2 | 3

interface PasosCompraProps {
  actual: PasoCompra
  // Volver a un paso del checkout (1 = Datos y envío). El carrito se abre con su enlace.
  onVolver?: (paso: PasoCompra) => void
}

export default function PasosCompra({ actual, onVolver }: PasosCompraProps) {
  return (
    <nav aria-label="Pasos de la compra" className="mb-6">
      <ol className="grid grid-cols-4">
        {PASOS_COMPRA.map((nombre, i) => {
          const hecho = i < actual
          const esActual = i === actual
          const sePuedeVolver = hecho && actual < 2

          const contenido = (
            <>
              <span
                className={`relative z-10 grid h-9 w-9 place-items-center rounded-full text-sm font-bold tabular-nums ring-4 ring-fondo ${
                  hecho ? 'border-2 border-acento bg-tarjeta text-acento' : esActual ? 'bg-acento text-white shadow-tarjeta' : 'border border-borde bg-tarjeta text-texto-2'
                }`}
              >
                {hecho ? <LuCheck className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={`mt-1.5 text-center text-xs leading-tight ${esActual ? 'font-bold text-texto' : hecho ? 'font-semibold text-acento' : 'text-texto-2'}`}>
                {nombre}
                {hecho && <span className="sr-only"> (hecho)</span>}
              </span>
            </>
          )
          const clase = 'flex min-h-11 w-full flex-col items-center rounded-xl px-1 py-1'
          const claseVolver = `${clase} transition hover:bg-acento/10`

          let nodo = <span className={clase}>{contenido}</span>
          if (sePuedeVolver && i === 0) {
            nodo = <Link href="/carrito" className={claseVolver} aria-label="Volver al paso 1: Carrito">{contenido}</Link>
          } else if (sePuedeVolver && onVolver) {
            nodo = (
              <button type="button" onClick={() => onVolver(i as PasoCompra)} className={claseVolver} aria-label={`Volver al paso ${i + 1}: ${nombre}`}>
                {contenido}
              </button>
            )
          }

          return (
            <li key={nombre} className="relative" aria-current={esActual ? 'step' : undefined}>
              {/* Línea que une con el paso anterior, a la altura del centro del círculo */}
              {i > 0 && (
                <span aria-hidden="true" className={`absolute right-1/2 top-[22px] h-0.5 w-full -translate-y-1/2 ${i <= actual ? 'bg-acento' : 'bg-borde'}`} />
              )}
              {nodo}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
