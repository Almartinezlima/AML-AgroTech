'use client'
import Link from 'next/link'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import { Cifra } from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { clasePagina, claseTarjeta, claseTextoPendiente, claseTituloSeccion } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { Dashboard } from '@/types/comercio'
import { GraficoPedidosEstado, GraficoVentas } from './_components/Graficos'
import TarjetaMargen from './_components/TarjetaMargen'
import { LuBanknote, LuCalendarDays, LuCreditCard, LuHandCoins, LuTrendingUp, LuTriangleAlert, LuUndo2, LuWarehouse } from 'react-icons/lu'

const textoPedidos = (cantidad: number) => `${cantidad} pedido${cantidad === 1 ? '' : 's'}`

export default function AdminPage() {
  const { datos: d, cargando, error, recargar } = useDatosApi<Dashboard>('/api/dashboard')

  return (
    <div className={clasePagina}>
      <div className="max-w-6xl mx-auto">
        <EncabezadoAdmin
          titulo="Panel de administración"
          descripcion="Ventas, cobros e inventario de la tienda de un vistazo."
        />

        {cargando ? (
          <BloqueCarga filas={4} alto="h-28" />
        ) : error || !d ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Cifra titulo="Ventas de hoy" valor={formatoBs(d.ventas_hoy.total)} detalle={textoPedidos(d.ventas_hoy.pedidos)} icono={LuTrendingUp} tono="acento" />
              <Cifra titulo="Ventas del mes" valor={formatoBs(d.ventas_mes.total)} detalle={textoPedidos(d.ventas_mes.pedidos)} icono={LuCalendarDays} tono="acento" />
              <Cifra titulo="Pagos en revisión" valor={String(d.pagos_en_revision)} detalle="Ir a verificar" href="/admin/pagos" icono={LuCreditCard} tono={d.pagos_en_revision > 0 ? 'pendiente' : 'neutro'} />
              {d.reembolsos_pendientes && d.reembolsos_pendientes.pagos > 0 && (
                <Cifra titulo="Reembolsos pendientes" valor={formatoBs(d.reembolsos_pendientes.total)} detalle={`${d.reembolsos_pendientes.pagos} por devolver · Ver pagos`} href="/admin/pagos" icono={LuUndo2} tono="error" />
              )}
              <Cifra titulo="Valor del inventario" valor={formatoBs(d.valor_inventario)} icono={LuWarehouse} />
              <Cifra titulo="Cobrado" valor={formatoBs(d.cobrado)} icono={LuBanknote} tono="acento" />
              <Cifra titulo="Por cobrar" valor={formatoBs(d.por_cobrar)} icono={LuHandCoins} tono={d.por_cobrar > 0 ? 'pendiente' : 'neutro'} />
              <Cifra titulo="Stock bajo" valor={String(d.total_stock_bajo)} detalle="Ver inventario" href="/admin/inventario" icono={LuTriangleAlert} tono={d.total_stock_bajo > 0 ? 'pendiente' : 'neutro'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className={`${claseTarjeta} p-5`}>
                <h2 className={`${claseTituloSeccion} mb-4`}>Ventas de los últimos 7 días</h2>
                <GraficoVentas datos={d.ventas_7_dias} />
              </section>
              <section className={`${claseTarjeta} p-5`}>
                <h2 className={`${claseTituloSeccion} mb-4`}>Pedidos por estado</h2>
                <GraficoPedidosEstado datos={d.pedidos_por_estado} />
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TarjetaMargen />
              <section className={`${claseTarjeta} p-5`}>
                <h2 className={`${claseTituloSeccion} mb-4`}>Productos más vendidos</h2>
                {d.top_productos.length === 0 ? (
                  <p className="text-texto-2 text-sm">Aún no hay ventas registradas.</p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {d.top_productos.map((p, i) => (
                      <li key={p.nombre} className="flex justify-between gap-3 text-sm">
                        <span className="text-texto min-w-0 break-words">{i + 1}. {p.nombre}</span>
                        <span className="text-texto-2 whitespace-nowrap tabular-nums">{p.cantidad} · {formatoBs(p.ingresos)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={`${claseTarjeta} p-5`}>
                <h2 className={`${claseTituloSeccion} mb-4`}>Alertas de stock</h2>
                {d.stock_bajo.length === 0 ? (
                  <p className="text-texto-2 text-sm">Todo el inventario está sobre su mínimo.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {d.stock_bajo.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 text-sm">
                        <Link href={`/admin/inventario/${p.id}`} className="text-texto hover:text-acento min-w-0 break-words">{p.nombre}</Link>
                        <span className={`${claseTextoPendiente} whitespace-nowrap tabular-nums`}>{p.stock} / mín. {p.stock_minimo}</span>
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
