'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LuArrowLeft, LuCircleCheck, LuClipboardList, LuUpload } from 'react-icons/lu'
import PasosCompra from '@/components/compra/PasosCompra'
import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, claseBotonSecundario, clasePagina, claseTituloSeccion } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { estadoCliente } from '@/lib/ecommerce/presentacion'
import type { PedidoDetalle } from '@/types/comercio'

function ContenidoExito() {
  const id = useSearchParams().get('id')
  const { datos: pedido, cargando, error, recargar } = useDatosApi<PedidoDetalle>(id ? `/api/pedidos/${id}` : null)

  const verPedidos = <Link href="/pedidos" className={claseBotonSecundario}>Mis pedidos</Link>
  if (!id) return <BloqueError titulo="No encontramos el pedido" mensaje="Revisa tus compras en «Mis pedidos».">{verPedidos}</BloqueError>
  if (cargando) return <BloqueCarga filas={2} alto="h-40" />
  if (error || !pedido) {
    return <BloqueError mensaje={error || 'No encontramos el pedido.'} onReintentar={() => void recargar()}>{verPedidos}</BloqueError>
  }

  const contraEntrega = pedido.metodo_pago === 'contra_entrega'
  const estado = estadoCliente({
    estado: pedido.estado,
    estado_pago: pedido.estado_pago,
    metodo_pago: pedido.metodo_pago,
    tipoZona: pedido.zonas_envio?.tipo,
    monto: pedido.total,
  })

  return (
    <div className="rounded-2xl border border-acento bg-tarjeta p-5 shadow-tarjeta sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-acento/10 text-acento ring-1 ring-acento/30">
          <LuCircleCheck className="h-9 w-9" aria-hidden="true" />
        </span>
        <h1 className="mb-2 font-titulo text-3xl font-bold text-texto">¡Pedido registrado!</h1>
        <p className="text-texto-2">Tu código es <span className="font-titulo font-bold text-acento">{pedido.codigo}</span></p>
        <div className="mt-3 flex justify-center"><Insignia info={estado} /></div>
      </div>

      <section className="mb-6 rounded-xl border border-borde bg-tarjeta-hover/60 p-4" aria-labelledby="siguiente-paso">
        <h2 id="siguiente-paso" className={`${claseTituloSeccion} mb-1`}>
          {contraEntrega ? 'Qué sigue' : `Paga tu pedido con ${pedido.metodo_pago === 'qr' ? 'QR' : 'transferencia'}`}
        </h2>
        <p className="mb-4 text-sm text-texto-2">{estado.queSigue}</p>
        <InstruccionesPago metodo={pedido.metodo_pago} monto={pedido.total} codigo={pedido.codigo} />
      </section>

      <div className="flex flex-col gap-3">
        <Link href={`/pedidos/${pedido.id}`} className={claseBotonPrimario}>
          {contraEntrega
            ? 'Ver el estado de mi pedido'
            : <><LuUpload className="h-5 w-5" aria-hidden="true" /> Ya pagué: subir comprobante</>}
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/pedidos" className={claseBotonSecundario}>
            <LuClipboardList className="h-4 w-4" aria-hidden="true" /> Mis pedidos
          </Link>
          <Link href="/catalogo" className={claseBotonSecundario}>
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutExitoPage() {
  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-2xl">
        <PasosCompra actual={3} />
        <Suspense fallback={<BloqueCarga filas={2} alto="h-40" />}>
          <ContenidoExito />
        </Suspense>
      </div>
    </div>
  )
}
