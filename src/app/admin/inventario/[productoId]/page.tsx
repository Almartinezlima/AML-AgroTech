'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonSecundario, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_MOVIMIENTO, fechaHora } from '@/lib/ecommerce/presentacion'
import type { Movimiento, Producto } from '@/types/comercio'
import { LuNotebookText } from 'react-icons/lu'

export default function KardexPage() {
  const { productoId } = useParams<{ productoId: string }>()
  const producto = useDatosApi<Producto>(`/api/productos/${productoId}`)
  const { datos, cargando, error, recargar } = useDatosApi<Movimiento[]>(`/api/inventario/movimientos?producto=${productoId}`)

  return (
    <div className={clasePagina}>
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/inventario" className="text-acento hover:text-acento-hover text-sm">← Inventario</Link>

        <div className="flex items-start justify-between gap-3 flex-wrap mt-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-texto break-words">Kardex{producto.datos ? `: ${producto.datos.nombre}` : ''}</h1>
            {producto.datos && <p className="text-texto-2 text-sm">{producto.datos.sku ?? 'Sin SKU'} · Stock actual: {producto.datos.stock} {producto.datos.unidad}</p>}
          </div>
          <a href={`/api/inventario/movimientos?producto=${productoId}&formato=csv`} className={`${claseBotonSecundario} !px-3 !py-2 text-sm`}>Exportar CSV</a>
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : datos.length === 0 ? (
          <BloqueVacio icono={LuNotebookText} mensaje="Este producto aún no tiene movimientos" />
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.map((m) => {
              const delta = m.stock_nuevo - m.stock_anterior
              return (
                <li key={m.id} className={`${claseTarjeta} p-4`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-texto text-sm break-words">{m.motivo ?? 'Sin motivo'}</p>
                      <p className="text-texto-2 text-xs">{fechaHora(m.created_at)}{m.usuario ? ` · ${m.usuario}` : ''}</p>
                    </div>
                    <Insignia info={INFO_MOVIMIENTO[m.tipo]} />
                  </div>
                  <p className="text-texto-2 text-sm mt-2">
                    <span className="text-texto font-bold">{delta > 0 ? '+' : ''}{delta}</span> · Saldo: {m.stock_anterior} → <span className="text-texto font-semibold">{m.stock_nuevo}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
