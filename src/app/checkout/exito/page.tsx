'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { PedidoDetalle } from '@/types/comercio'
import { LuCircleCheck } from 'react-icons/lu'

function ContenidoExito() {
  const id = useSearchParams().get('id')
  const { datos: pedido, cargando, error, recargar } = useDatosApi<PedidoDetalle>(id ? `/api/pedidos/${id}` : null)

  if (!id) return <BloqueError mensaje="No encontramos el pedido." />
  if (cargando) return <BloqueCarga filas={2} alto="h-40" />
  if (error || !pedido) return <BloqueError mensaje={error || 'No encontramos el pedido.'} onReintentar={() => void recargar()} />

  const contraEntrega = pedido.metodo_pago === 'contra_entrega'

  return (
    <div className="bg-[#111811] border border-[#22c55e] rounded-2xl p-6 sm:p-10">
      <div className="text-center mb-6">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-acento/10 text-acento ring-1 ring-acento/30"><LuCircleCheck className="h-9 w-9" aria-hidden="true" /></span>
        <h1 className="font-titulo text-3xl font-bold text-texto mb-2">¡Pedido registrado!</h1>
        <p className="text-[#86efac]">Tu código es <span className="text-[#22c55e] font-mono font-bold">{pedido.codigo}</span></p>
      </div>

      <div className="bg-[#162016] border border-[#1a2e1a] rounded-xl p-4 mb-6">
        <p className="text-[#f0fdf4] font-semibold mb-3">Siguiente paso</p>
        <InstruccionesPago metodo={pedido.metodo_pago} monto={pedido.total} codigo={pedido.codigo} />
        {!contraEntrega && (
          <p className="text-[#86efac] text-sm mt-3">Cuando pagues, sube tu comprobante en el detalle del pedido.</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/pedidos/${pedido.id}`} className={`${claseBotonPrimario} flex-1`}>
          {contraEntrega ? 'Ver mi pedido' : 'Subir comprobante'}
        </Link>
        <Link href="/catalogo" className={`${claseBotonSecundario} flex-1`}>Seguir comprando</Link>
      </div>
    </div>
  )
}

export default function CheckoutExitoPage() {
  return (
    <div className={clasePagina}>
      <div className="max-w-xl mx-auto">
        <Suspense fallback={<BloqueCarga filas={2} alto="h-40" />}>
          <ContenidoExito />
        </Suspense>
      </div>
    </div>
  )
}
