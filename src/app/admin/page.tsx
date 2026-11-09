'use client'
import Link from 'next/link'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { Dashboard } from '@/types/comercio'
import { GraficoPedidosEstado, GraficoVentas } from './_components/Graficos'

function Cifra({ titulo, valor, detalle, href }: { titulo: string; valor: string; detalle?: string; href?: string }) {
  const contenido = (
    <>
      <p className="text-[#86efac] text-sm">{titulo}</p>
      <p className="text-2xl font-bold text-[#f0fdf4] mt-1 break-words">{valor}</p>
      {detalle && <p className="text-[#86efac] text-xs mt-1">{detalle}</p>}
    </>
  )
  return href
    ? <Link href={href} className={`${claseTarjeta} p-4 hover:border-[#22c55e] transition-colors`}>{contenido}</Link>
    : <div className={`${claseTarjeta} p-4`}>{contenido}</div>
}

export default function AdminPage() {
  const { datos: d, cargando, error, recargar } = useDatosApi<Dashboard>('/api/dashboard')

  return (
    <div className={clasePagina}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-8">Panel de administración</h1>

        {cargando ? (
          <BloqueCarga filas={4} alto="h-28" />
        ) : error || !d ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Cifra titulo="Ventas de hoy" valor={formatoBs(d.ventas_hoy.total)} detalle={`${d.ventas_hoy.pedidos} pedidos`} />
              <Cifra titulo="Ventas del mes" valor={formatoBs(d.ventas_mes.total)} detalle={`${d.ventas_mes.pedidos} pedidos`} />
              <Cifra titulo="Pagos en revisión" valor={String(d.pagos_en_revision)} detalle="Ir a verificar" href="/admin/pagos" />
              <Cifra titulo="Valor del inventario" valor={formatoBs(d.valor_inventario)} />
              <Cifra titulo="Cobrado" valor={formatoBs(d.cobrado)} />
              <Cifra titulo="Por cobrar" valor={formatoBs(d.por_cobrar)} />
              <Cifra titulo="Stock bajo" valor={String(d.total_stock_bajo)} detalle="Ver inventario" href="/admin/inventario" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className={`${claseTarjeta} p-5`}>
                <h2 className="text-[#f0fdf4] font-bold mb-4">Ventas de los últimos 7 días</h2>
                <GraficoVentas datos={d.ventas_7_dias} />
              </section>
              <section className={`${claseTarjeta} p-5`}>
                <h2 className="text-[#f0fdf4] font-bold mb-4">Pedidos por estado</h2>
                <GraficoPedidosEstado datos={d.pedidos_por_estado} />
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className={`${claseTarjeta} p-5`}>
                <h2 className="text-[#f0fdf4] font-bold mb-4">Productos más vendidos</h2>
                {d.top_productos.length === 0 ? (
                  <p className="text-[#86efac] text-sm">Aún no hay ventas registradas.</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {d.top_productos.map((p, i) => (
                      <li key={p.nombre} className="flex justify-between gap-3 text-sm">
                        <span className="text-[#f0fdf4] min-w-0 break-words">{i + 1}. {p.nombre}</span>
                        <span className="text-[#86efac] whitespace-nowrap">{p.cantidad} · {formatoBs(p.ingresos)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={`${claseTarjeta} p-5`}>
                <h2 className="text-[#f0fdf4] font-bold mb-4">Alertas de stock</h2>
                {d.stock_bajo.length === 0 ? (
                  <p className="text-[#86efac] text-sm">Todo el inventario está sobre su mínimo.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {d.stock_bajo.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 text-sm">
                        <Link href={`/admin/inventario/${p.id}`} className="text-[#f0fdf4] hover:text-[#22c55e] min-w-0 break-words">{p.icono} {p.nombre}</Link>
                        <span className="text-[#f59e0b] whitespace-nowrap">{p.stock} / mín. {p.stock_minimo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
