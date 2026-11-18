'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LuArrowLeft, LuCircleCheck, LuClipboardList } from 'react-icons/lu'
import PasosCompra from '@/components/compra/PasosCompra'
import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import SubirComprobante from '@/components/pagos/SubirComprobante'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, claseBotonSecundario, claseTituloSeccion } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { estadoCliente } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoDetalle } from '@/types/comercio'

// Clic 3 de la compra (fase 9E): con QR o transferencia, el cobro y justo debajo la subida de la
// foto del pago con «Enviar». Con efectivo al recibir, el pedido ya está confirmado.
function ContenidoExito() {
  const id = useSearchParams().get('id')
  const { datos: pedido, cargando, error, recargar } = useDatosApi<PedidoDetalle>(id ? `/api/pedidos/${id}` : null)

  const verPedidos = <Link href="/pedidos" className={claseBotonSecundario}>Mis pedidos</Link>
  if (!id) return <BloqueError titulo="No encontramos el pedido" mensaje="Revisa tus compras en «Mis pedidos».">{verPedidos}</BloqueError>
  if (cargando && !pedido) return <BloqueCarga filas={2} alto="h-40" />
  if (error || !pedido) {
    return <BloqueError mensaje={error || 'No encontramos el pedido.'} onReintentar={() => void recargar()}>{verPedidos}</BloqueError>
  }

  const efectivo = pedido.metodo_pago === 'contra_entrega'
  const estadoPago = pedido.pagos?.estado ?? pedido.estado_pago
  const faltaPagar = !efectivo && pedido.estado !== 'cancelado' && (estadoPago === 'pendiente' || estadoPago === 'rechazado')
  const estado = estadoCliente({
    estado: pedido.estado,
    estado_pago: pedido.estado_pago,
    metodo_pago: pedido.metodo_pago,
    tipoZona: pedido.zonas_envio?.tipo,
    monto: pedido.total,
  })

  const salidas = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link href={`/pedidos/${pedido.id}`} className={claseBotonSecundario}>
        <LuClipboardList className="h-4 w-4" aria-hidden="true" /> Ver mi pedido
      </Link>
      <Link href="/catalogo" className={claseBotonSecundario}>
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Seguir comprando
      </Link>
    </div>
  )

  return (
    <>
      <PasosCompra actual={faltaPagar ? 2 : 3} />
      <div className="min-w-0 rounded-2xl border border-acento bg-tarjeta p-4 shadow-tarjeta sm:p-8">
        <div className="mb-6 text-center">
          {!faltaPagar && (
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-acento/10 text-acento ring-1 ring-acento/30">
              <LuCircleCheck className="h-9 w-9" aria-hidden="true" />
            </span>
          )}
          <h1 className="mb-2 font-titulo text-3xl font-bold text-texto">
            {faltaPagar ? `Paga ${formatoBs(pedido.total)}` : efectivo ? '¡Pedido confirmado!' : '¡Recibimos tu comprobante!'}
          </h1>
          <p className="text-texto-2">Tu pedido es <span className="font-titulo font-bold text-acento">{pedido.codigo}</span></p>
          <div className="mt-3 flex justify-center"><Insignia info={estado} /></div>
        </div>

        {faltaPagar ? (
          <div className="flex flex-col gap-5">
            <section aria-labelledby="como-pagar" className="min-w-0">
              <h2 id="como-pagar" className={`${claseTituloSeccion} mb-3`}>
                {pedido.metodo_pago === 'qr' ? '1. Paga con el QR' : '1. Transfiere a la cuenta de la tienda'}
              </h2>
              <InstruccionesPago metodo={pedido.metodo_pago} monto={pedido.total} codigo={pedido.codigo} />
            </section>
            <section aria-label="2. Sube la foto del pago" className="min-w-0">
              <h2 className={`${claseTituloSeccion} mb-3`}>2. Sube la foto del pago</h2>
              {estadoPago === 'rechazado' && pedido.pagos?.motivo_rechazo && (
                <p className="mb-3 rounded-xl bg-estado-error/5 px-4 py-3 text-sm text-estado-error-texto">
                  La tienda no pudo validar tu comprobante anterior: {pedido.pagos.motivo_rechazo}
                </p>
              )}
              <SubirComprobante pedidoId={pedido.id} onEnviado={() => void recargar()} />
            </section>
            <Link href={`/pedidos/${pedido.id}`} className="text-center text-sm font-semibold text-acento hover:underline">
              Pagar después: lo encuentras en «Mis pedidos»
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="rounded-xl border border-borde bg-tarjeta-hover/60 p-4 text-texto">{estado.queSigue}</p>
            <Link href={`/pedidos/${pedido.id}`} className={claseBotonPrimario}>Ver el estado de mi pedido</Link>
            {salidas}
          </div>
        )}
      </div>
    </>
  )
}

export default function CheckoutExitoPage() {
  return (
    <div className="min-h-screen bg-fondo px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<BloqueCarga filas={2} alto="h-40" />}>
          <ContenidoExito />
        </Suspense>
      </div>
    </div>
  )
}
