import { LuQrCode, LuShoppingBasket, LuTruck } from 'react-icons/lu'

const PASOS = [
  { icono: LuShoppingBasket, titulo: 'Elige', texto: 'Busca en el catálogo y arma tu carrito con precios en bolivianos y stock real.' },
  { icono: LuQrCode, titulo: 'Paga con QR', texto: 'Escanea el QR desde la app de tu banco y sube el comprobante. También transferencia o contra entrega en Villa Charcas.' },
  { icono: LuTruck, titulo: 'Recibe en tu pueblo', texto: 'Despachamos por flota o encomienda. Sigue tu pedido con el número de guía.' },
]

// Los tres pasos de una compra (es una secuencia real: por eso van numerados)
export default function ComoComprar() {
  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
        <li key={titulo} className="relative h-full overflow-hidden rounded-2xl border border-borde bg-gradient-to-br from-tarjeta to-[#f3f7ee] p-6 shadow-lg shadow-black/5">
          <span className="pointer-events-none absolute right-4 top-3 font-titulo text-7xl font-extrabold leading-none text-trigo-suave/40 select-none" aria-hidden="true">{i + 1}</span>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-acento/15 text-acento ring-1 ring-acento/30">
            <Icono className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-semibold text-trigo">Paso {i + 1}</p>
          <h3 className="mt-1 font-titulo text-2xl font-bold text-texto">{titulo}</h3>
          <p className="mt-2 text-texto-2">{texto}</p>
        </li>
      ))}
    </ol>
  )
}
