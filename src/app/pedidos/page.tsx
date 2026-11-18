'use client'
import Link from 'next/link'
import CodigoEntrega from '@/components/entrega/CodigoEntrega'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, clasePagina, claseTarjeta, claseTituloPagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ETIQUETA_METODO, estadoCliente, fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoResumen } from '@/types/comercio'
import { LuArrowRight, LuPackage } from 'react-icons/lu'

export default function PedidosPage() {
  const { datos: pedidos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>('/api/pedidos')

  return (
    <div className={clasePagina}>
      <div className="max-w-4xl mx-auto">
        <h1 className={`${claseTituloPagina} mb-2`}>Mis pedidos</h1>
        <p className="text-texto-2 mb-8">Mira en qué va cada compra y qué tienes que hacer</p>

        {cargando ? (
          <BloqueCarga />
        ) : error || !pedidos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : pedidos.length === 0 ? (
          <BloqueVacio icono={LuPackage} mensaje="Todavía no tienes pedidos">
            <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
          </BloqueVacio>
        ) : (
          <ul className="flex flex-col gap-3">
            {pedidos.map((pedido) => {
              const estado = estadoCliente({
                estado: pedido.estado,
                estado_pago: pedido.estado_pago,
                metodo_pago: pedido.metodo_pago,
                tipoZona: pedido.zonas_envio?.tipo,
                monto: pedido.total,
              })
              return (
                <li key={pedido.id}>
                  <Link href={`/pedidos/${pedido.id}`} className={`${claseTarjeta} block p-4 sm:p-5 hover:border-acento transition-colors`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-acento font-titulo text-lg font-bold">{pedido.codigo}</p>
                        <p className="text-texto-2 text-xs mt-1">{fechaHora(pedido.created_at)}</p>
                      </div>
                      <Insignia info={estado} />
                    </div>
                    <p className="mt-3 text-sm text-texto">{estado.queSigue}</p>
                    {/* Código de entrega de los pedidos en camino (fase 9D, solo los propios) */}
                    {pedido.codigo_entrega && <div className="mt-3"><CodigoEntrega codigo={pedido.codigo_entrega} compacto enTienda={pedido.estado === 'listo_para_recoger'} /></div>}
                    <div className="flex items-end justify-between gap-3 mt-3">
                      <p className="text-texto-2 text-sm min-w-0">
                        {pedido.zonas_envio?.nombre} · {ETIQUETA_METODO[pedido.metodo_pago]}
                      </p>
                      <p className="text-texto font-bold whitespace-nowrap tabular-nums">{formatoBs(pedido.total)}</p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-acento">
                      Ver detalle <LuArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
