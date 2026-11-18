'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuArrowRight, LuCircleAlert, LuPackage, LuPlay, LuUser } from 'react-icons/lu'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseEnlace, claseTarjeta, claseTextoError } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { ETIQUETA_TIPO_ZONA, INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import type { PedidoCola } from '@/types/almacen'

// Un pedido de la cola: código, cliente, zona, avance de la caja y faltantes.
// Fase 9G: los confirmados traen «Empezar a preparar», que empieza y abre el detalle.
export default function TarjetaCola({ pedido }: { pedido: PedidoCola }) {
  const router = useRouter()
  const [empezando, setEmpezando] = useState(false)
  const [error, setError] = useState('')
  const avance = pedido.productos > 0 ? Math.round((pedido.marcados / pedido.productos) * 100) : 0
  const detalle = `/admin/preparar/pedidos/${pedido.id}`

  const empezar = async () => {
    setEmpezando(true)
    setError('')
    try {
      await enviarJson(`/api/almacen/pedidos/${pedido.id}/preparar`, 'POST', {})
      router.push(detalle)
    } catch (causa) {
      setError(mensajeDeError(causa))
      setEmpezando(false)
    }
  }

  return (
    <article className={`${claseTarjeta} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={detalle} className={`${claseEnlace} font-titulo text-lg`}>{pedido.codigo}</Link>
          <p className="text-sm text-texto-2">Pedido el {diaHora(pedido.created_at)}</p>
        </div>
        <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
      </div>

      <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <div className="flex min-w-0 gap-1.5"><dt className="text-texto-2">Cliente:</dt><dd className="min-w-0 break-words text-texto">{pedido.cliente ?? '—'}</dd></div>
        <div className="flex min-w-0 gap-1.5">
          <dt className="text-texto-2">Entrega:</dt>
          <dd className="min-w-0 break-words text-texto">{pedido.zona ?? '—'}{pedido.tipo_zona ? ` · ${ETIQUETA_TIPO_ZONA[pedido.tipo_zona]}` : ''}</dd>
        </div>
      </dl>

      {pedido.estado === 'preparando' && (
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-texto-2"><LuPackage className="h-4 w-4" aria-hidden="true" /> En la caja</span>
            <span className="font-semibold tabular-nums text-texto">{pedido.marcados} de {pedido.productos}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tarjeta-hover" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label="Productos en la caja">
            <div className="h-full rounded-full bg-acento" style={{ width: `${avance}%` }} />
          </div>
          {pedido.preparacion_por && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-texto-2"><LuUser className="h-4 w-4" aria-hidden="true" /> Prepara {pedido.preparacion_por}</p>
          )}
        </div>
      )}

      {pedido.faltantes_abiertos > 0 && (
        <p className="inline-flex items-center gap-1.5 self-start rounded-lg bg-estado-error/10 px-2.5 py-1.5 text-sm font-semibold text-estado-error-texto">
          <LuCircleAlert className="h-4 w-4" aria-hidden="true" /> Faltante sin resolver
        </p>
      )}

      {pedido.bultos && pedido.empacado_en && (
        <p className="text-sm text-texto-2">Listo el {diaHora(pedido.empacado_en)} · {pedido.bultos} {pedido.bultos === 1 ? 'bulto' : 'bultos'}</p>
      )}

      {error && <p role="alert" className={`${claseTextoError} text-sm`}>{error}</p>}

      {pedido.estado === 'confirmado' ? (
        <button type="button" disabled={empezando} onClick={() => void empezar()} className={`${claseBoton('primario')} w-full sm:w-auto sm:self-end`}>
          <LuPlay className="h-5 w-5" aria-hidden="true" /> {empezando ? 'Empezando…' : 'Empezar a preparar'}
        </button>
      ) : (
        <Link href={detalle} className={`${claseBoton('secundario', 'chico')} self-end`}>
          {pedido.estado === 'preparando' ? 'Seguir preparando' : 'Ver pedido'} <LuArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  )
}
