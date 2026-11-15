'use client'
import Link from 'next/link'
import { claseEnlace, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { ResumenMargen } from '@/types/abastecimiento'
import { textoPorcentaje } from '../margen/_components/TablaMargen'

// Panel: margen promedio y los 3 productos que dejan menos
export default function TarjetaMargen() {
  const { datos, cargando, error } = useDatosApi<ResumenMargen>('/api/margen')

  return (
    <section className={`${claseTarjeta} p-5`} aria-labelledby="titulo-margen">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-margen" className={claseTituloSeccion}>Margen promedio</h2>
        <Link href="/admin/margen" className={`${claseEnlace} text-sm`}>Ver el margen de todo</Link>
      </div>
      {cargando ? (
        <div className="esqueleto h-24 rounded-xl" role="status" aria-label="Cargando" />
      ) : error || !datos ? (
        <p className="text-sm text-texto-2">{error || 'No se pudo cargar el margen.'}</p>
      ) : (
        <>
          <p className="font-titulo text-3xl font-bold tabular-nums text-texto">
            {datos.margen_promedio === null ? '—' : textoPorcentaje(datos.margen_promedio)}
          </p>
          <p className="mb-4 text-xs text-texto-2">
            {datos.estimados > 0 ? `${datos.estimados} con costo estimado (todavía sin compras recibidas)` : 'Con el costo de las compras recibidas'}
          </p>
          {datos.menores.length > 0 && (
            <>
              <p className="mb-2 text-sm font-semibold text-texto">Los que dejan menos</p>
              <ol className="flex flex-col gap-2">
                {datos.menores.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words text-texto">{p.nombre}</span>
                    <span className={`whitespace-nowrap tabular-nums ${(p.margen_bs ?? 0) < 0 ? 'font-bold text-estado-error-texto' : 'text-texto-2'}`}>
                      {formatoBs(p.margen_bs ?? 0)} · {textoPorcentaje(p.margen_pct ?? 0)}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </section>
  )
}
