'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LuClipboardList } from 'react-icons/lu'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseFilaFiltros, claseFiltro, claseTarjeta } from '@/components/ui/estilos'
import { INFO_ESTADO_ORDEN, fechaCorta } from '@/lib/abastecimiento/ordenes'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import { ESTADOS_ORDEN_COMPRA, type EstadoOrdenCompra, type OrdenCompraResumen } from '@/types/abastecimiento'

// Órdenes de compra por estado, de todos los proveedores
export default function ListaOrdenes() {
  const { datos, cargando, error, recargar } = useDatosApi<OrdenCompraResumen[]>('/api/ordenes-compra')
  const [filtro, setFiltro] = useState<EstadoOrdenCompra | 'todas'>('todas')

  const ordenes = useMemo(() => datos ?? [], [datos])
  const cuenta = (estado: EstadoOrdenCompra) => ordenes.filter((o) => o.estado === estado).length
  const visibles = filtro === 'todas' ? ordenes : ordenes.filter((o) => o.estado === filtro)

  return (
    <section aria-labelledby="titulo-ordenes">
      <h2 id="titulo-ordenes" className="mb-3 font-titulo text-xl font-bold text-texto">Órdenes de compra</h2>

      <div className={`${claseFilaFiltros} mb-4`} role="group" aria-label="Filtrar órdenes por estado">
        <button type="button" onClick={() => setFiltro('todas')} aria-pressed={filtro === 'todas'} className={claseFiltro(filtro === 'todas')}>
          Todas {ordenes.length}
        </button>
        {ESTADOS_ORDEN_COMPRA.map((estado) => (
          <button key={estado} type="button" onClick={() => setFiltro(estado)} aria-pressed={filtro === estado} className={claseFiltro(filtro === estado)}>
            {INFO_ESTADO_ORDEN[estado].etiqueta} {cuenta(estado)}
          </button>
        ))}
      </div>

      {cargando ? (
        <BloqueCarga filas={3} />
      ) : error || !datos ? (
        <BloqueError mensaje={error} onReintentar={() => void recargar()} />
      ) : visibles.length === 0 ? (
        <BloqueVacio icono={LuClipboardList} mensaje={filtro === 'todas' ? 'Todavía no hay órdenes de compra' : `No hay órdenes en «${INFO_ESTADO_ORDEN[filtro].etiqueta}»`}>
          <p className="text-sm text-texto-2">{filtro === 'todas' ? 'Marca arriba lo que quieres pedir y toca «Armar orden».' : 'Elige «Todas» para ver las demás órdenes.'}</p>
        </BloqueVacio>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((o) => (
            <li key={o.id} className={`${claseTarjeta} flex flex-col gap-3 p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="font-titulo text-lg font-bold text-texto">{o.codigo}</p>
                  <p className="text-sm text-texto-2 break-words">{o.distribuidor?.nombre_comercial ?? 'Proveedor'} · {o.distribuidor?.ciudad}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia info={INFO_ESTADO_ORDEN[o.estado]} />
                </div>
              </div>
              <p className="text-sm text-texto-2">
                {o.cantidad_lineas} producto{o.cantidad_lineas === 1 ? '' : 's'} · armada el {fechaHora(o.created_at)}
                {o.fecha_estimada ? ` · llega el ${fechaCorta(o.fecha_estimada)}` : ''}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
                <p className="font-titulo text-lg font-bold tabular-nums text-texto">{formatoBs(o.total)}</p>
                <Link href={`/admin/abastecimiento/ordenes/${o.id}`} className={claseBoton('suave', 'chico')}>
                  Ver orden {o.codigo}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
