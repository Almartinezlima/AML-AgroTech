'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { INFO_ESTADO_PEDIDO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Dashboard } from '@/types/comercio'

const VERDE = '#22c55e'
const EJE = { fill: '#86efac', fontSize: 12 }
const ESTILO_TOOLTIP = {
  contentStyle: { backgroundColor: '#162016', border: '1px solid #1a2e1a', borderRadius: 8 },
  labelStyle: { color: '#f0fdf4' },
  itemStyle: { color: '#f0fdf4' },
  cursor: { fill: '#1a2e1a' },
}

const diaMes = (fecha: string) => `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`

// Cada gráfico lleva una tabla oculta para lectores de pantalla
export function GraficoVentas({ datos }: { datos: Dashboard['ventas_7_dias'] }) {
  if (datos.every((d) => Number(d.total) === 0)) {
    return <p className="text-[#86efac] text-sm py-16 text-center">Sin ventas en estos días.</p>
  }

  const filas = datos.map((d) => ({ dia: diaMes(d.fecha), total: Number(d.total) }))

  return (
    <>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid stroke="#1a2e1a" vertical={false} />
            <XAxis dataKey="dia" tick={EJE} axisLine={false} tickLine={false} />
            <YAxis tick={EJE} axisLine={false} tickLine={false} width={48} />
            <Tooltip {...ESTILO_TOOLTIP} formatter={(valor) => [formatoBs(Number(valor)), 'Ventas']} />
            <Bar dataKey="total" fill={VERDE} radius={[4, 4, 0, 0]} maxBarSize={32} />
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
    return <p className="text-[#86efac] text-sm py-16 text-center">Aún no hay pedidos.</p>
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
            <Bar dataKey="total" fill={VERDE} radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: 'right', fill: '#f0fdf4', fontSize: 12 }} />
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
