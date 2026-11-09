'use client'
import Link from 'next/link'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO, INFO_ESTADO_PEDIDO, fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoResumen } from '@/types/comercio'

export default function PedidosPage() {
  const { datos: pedidos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>('/api/pedidos')

  return (
    <div className={clasePagina}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-2">Mis pedidos</h1>
        <p className="text-[#86efac] mb-8">Revisa el estado, el pago y el envío de tus compras</p>

        {cargando ? (
          <BloqueCarga />
        ) : error || !pedidos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : pedidos.length === 0 ? (
          <BloqueVacio icono="📦" mensaje="Todavía no tienes pedidos">
            <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
          </BloqueVacio>
        ) : (
          <ul className="flex flex-col gap-3">
            {pedidos.map((pedido) => (
              <li key={pedido.id}>
                <Link href={`/pedidos/${pedido.id}`} className={`${claseTarjeta} block p-4 sm:p-5 hover:border-[#22c55e] transition-colors`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[#22c55e] font-mono font-bold">{pedido.codigo}</p>
                      <p className="text-[#86efac] text-xs mt-1">{fechaHora(pedido.created_at)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
                      <Insignia info={INFO_ESTADO_PAGO[pedido.estado_pago]} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-3 mt-3">
                    <p className="text-[#86efac] text-sm min-w-0">
                      {pedido.zonas_envio?.nombre} · {ETIQUETA_METODO[pedido.metodo_pago]}
                    </p>
                    <p className="text-[#f0fdf4] font-bold whitespace-nowrap">{formatoBs(pedido.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
