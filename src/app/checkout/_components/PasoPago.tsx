import { LuQrCode } from 'react-icons/lu'

// Forma de pago (fase 9F): solo QR. No hay nada que elegir: se avisa cómo se paga.
export default function PasoPago() {
  return (
    <section aria-labelledby="titulo-pago" className="flex min-w-0 flex-col gap-3">
      <h2 id="titulo-pago" className="text-base font-semibold text-texto">Pagas con QR</h2>
      <div className="flex items-center gap-3 rounded-2xl border border-acento/40 bg-tarjeta p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acento/10 text-acento">
          <LuQrCode className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="min-w-0 text-sm text-texto-2">
          Al confirmar te mostramos el QR de la tienda con el monto exacto. Pagas con la app de tu banco y subes la foto del pago.
        </p>
      </div>
    </section>
  )
}
