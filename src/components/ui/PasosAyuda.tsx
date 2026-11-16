import type { ReactNode } from 'react'
import { LuLightbulb } from 'react-icons/lu'
import { claseTarjeta } from './estilos'

// Recuadro corto arriba de una pantalla con los pasos a seguir (1, 2, 3...)
export default function PasosAyuda({ titulo = 'Cómo usar esta pantalla', pasos }: { titulo?: string; pasos: ReactNode[] }) {
  return (
    <section aria-label={titulo} className={`${claseTarjeta} mb-6 p-4 sm:p-5`}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto">
        <LuLightbulb className="h-4 w-4 shrink-0 text-trigo" aria-hidden="true" /> {titulo}
      </p>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pasos.map((paso, i) => (
          <li key={i} className="flex min-w-0 items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acento text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 break-words pt-0.5 text-sm text-texto-2">{paso}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
