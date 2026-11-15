import Insignia from '@/components/ui/Insignia'
import { claseTarjeta } from '@/components/ui/estilos'
import { formatoBs } from '@/lib/utils'
import type { MargenProducto } from '@/types/abastecimiento'

const INSIGNIA_ESTIMADO = { etiqueta: 'Estimado', color: '#f59e0b' }

// "23,5 %"
export const textoPorcentaje = (valor: number) => `${valor.toFixed(1).replace('.', ',')} %`

const claseMargen = (margen: number | null) =>
  margen === null ? 'text-texto-2' : margen < 0 ? 'text-estado-error-texto font-bold' : 'text-texto font-semibold'

function Costo({ p }: { p: MargenProducto }) {
  if (p.costo === null) return <span className="text-texto-2">Sin costo</span>
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="tabular-nums">{formatoBs(p.costo)}</span>
      {p.tipo_costo === 'estimado' && <Insignia info={INSIGNIA_ESTIMADO} />}
    </span>
  )
}

// Desde 768 px una tabla con columnas; en celular, tarjetas apiladas (nunca scroll de la página)
export default function TablaMargen({ productos }: { productos: MargenProducto[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden" aria-label="Margen por producto">
        {productos.map((p) => (
          <li key={p.id} className={`${claseTarjeta} flex flex-col gap-2 p-4`}>
            <p className="font-semibold text-texto break-words">{p.nombre}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-texto-2">Precio</dt>
              <dd className="tabular-nums text-texto">{formatoBs(p.precio)} / {p.unidad}</dd>
              <dt className="text-texto-2">Costo</dt>
              <dd><Costo p={p} /></dd>
              <dt className="text-texto-2">Margen</dt>
              <dd className={`tabular-nums ${claseMargen(p.margen_bs)}`}>
                {p.margen_bs === null ? '—' : `${formatoBs(p.margen_bs)} · ${textoPorcentaje(p.margen_pct ?? 0)}`}
              </dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className={`${claseTarjeta} hidden overflow-x-auto md:block`}>
        <table className="w-full text-sm">
          <caption className="sr-only">Margen por producto, del más chico al más grande</caption>
          <thead>
            <tr className="border-b border-borde text-left text-texto-2">
              <th scope="col" className="px-4 py-3 font-medium">Producto</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Precio</th>
              <th scope="col" className="px-4 py-3 font-medium">Costo</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Margen Bs.</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Margen %</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-borde last:border-0">
                <td className="px-4 py-3">
                  <span className="block text-texto">{p.nombre}</span>
                  <span className="block text-xs text-texto-2">{p.sku ? `${p.sku} · ` : ''}por {p.unidad}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-texto">{formatoBs(p.precio)}</td>
                <td className="px-4 py-3"><Costo p={p} /></td>
                <td className={`px-4 py-3 text-right tabular-nums ${claseMargen(p.margen_bs)}`}>{p.margen_bs === null ? '—' : formatoBs(p.margen_bs)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${claseMargen(p.margen_pct)}`}>{p.margen_pct === null ? '—' : textoPorcentaje(p.margen_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
