import { InsigniaBanda } from '@/components/InsigniasFicha'
import type { Producto } from '@/types/comercio'
import { claseTarjeta } from '@/components/ui/estilos'

// Solo se muestran los campos que tienen dato; sin ninguno, el bloque no aparece
export default function FichaTecnica({ producto }: { producto: Producto }) {
  const filas = [
    { titulo: 'Composición', valor: producto.composicion },
    { titulo: 'Cultivos', valor: producto.cultivos },
    { titulo: 'Modo de uso', valor: producto.modo_uso },
    { titulo: 'Dosis', valor: producto.dosis },
  ].filter((fila): fila is { titulo: string; valor: string } => Boolean(fila.valor?.trim()))

  if (filas.length === 0 && !producto.banda_toxicologica) return null

  return (
    <section aria-labelledby="titulo-ficha" className={`${claseTarjeta} p-4`}>
      <h2 id="titulo-ficha" className="font-titulo text-lg font-bold text-texto">Ficha técnica</h2>
      <dl className="mt-3 grid gap-3 text-sm">
        {filas.map((fila) => (
          <div key={fila.titulo} className="grid gap-0.5 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
            <dt className="font-semibold text-texto">{fila.titulo}</dt>
            <dd className="whitespace-pre-line text-texto-2">{fila.valor}</dd>
          </div>
        ))}
        {producto.banda_toxicologica && (
          <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-3">
            <dt className="font-semibold text-texto">Toxicidad</dt>
            <dd><InsigniaBanda banda={producto.banda_toxicologica} /></dd>
          </div>
        )}
      </dl>
    </section>
  )
}
