'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { INFO_ESTADO_PEDIDO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Dashboard } from '@/types/comercio'

const VERDE = '#15753a'
const EJE = { fill: '#4a5a4e', fontSize: 14 }
const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#ffffff', border: '1px solid #dfe5d8', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  labelStyle: { color: '#17251b' },
  itemStyle: { color: '#17251b' },
  cursor: { fill: '#eef3ea' },
}

const diaMes = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`

// Cada gráfico lleva una tabla oculta para lectores de pantalla.
// Sin animación: recharts la repite en cada cambio de tamaño (girar el celular) y las barras desaparecen un momento
export function GraficoVentas({ datos }: { datos: Dashboard['ventas_7_dias'] }) {
  if (datos.every((d) => Number(d.total) === 0)) {
    return <p className="text-texto-2 text-sm py-16 text-center">Sin ventas en estos días.</p>
  }

  const filas = datos.map((d) => ({ dia: diaMes(d.fecha), total: Number(d.total) }))

  return (
    <>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="#dfe5d8" vertical={false} />
            <XAxis dataKey="dia" tick={EJE} axisLine={false} tickLine={false} />
            <YAxis tick={EJE} axisLine={false} tickLine={false} width={48} />
            <Tooltip {...ESTILO_TOOLTIP} formatter={(valor) => [formatoBs(Number(valor)), 'Ventas']} />
            <Bar dataKey="total" fill={VERDE} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Ventas por día</caption>
        <tbody>{filas.map((f) => <tr key={f.dia}><th scope="row">{f.dia}</th><td>{formatoBs(f.total)}</td></tr>)}</tbody>
      </table>
    </>
  )
}

export function GraficoPedidosEstado({ datos }: { datos: Dashboard['pedidos_por_estado'] }) {
  if (datos.length === 0) {
    return <p className="text-texto-2 text-sm py-16 text-center">Aún no hay pedidos.</p>
  }

  const filas = datos.map((d) => ({ estado: INFO_ESTADO_PEDIDO[d.estado].etiqueta, total: Number(d.total) }))

  return (
    <>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} layout="vertical" margin={{ left: 8, right: 24, top: 8 }}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="estado" tick={EJE} axisLine={false} tickLine={false} width={84} />
            <Tooltip {...ESTILO_TOOLTIP} formatter={(valor) => [String(valor), 'Pedidos']} />
            <Bar dataKey="total" fill={VERDE} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} label={{ position: 'right', fill: '#17251b', fontSize: 14 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Pedidos por estado</caption>
        <tbody>{filas.map((f) => <tr key={f.estado}><th scope="row">{f.estado}</th><td>{f.total}</td></tr>)}</tbody>
      </table>
    </>
  )
}
