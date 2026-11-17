'use client'
import { LuStar } from 'react-icons/lu'

const ETIQUETAS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']

// Estrellas de la calificación de la entrega (fase 9D). Sin onElegir solo se muestran.
export default function Estrellas({ valor, onElegir, tamano = 'normal' }: {
  valor: number
  onElegir?: (estrellas: number) => void
  tamano?: 'normal' | 'chico'
}) {
  const clase = tamano === 'chico' ? 'h-4 w-4' : 'h-8 w-8'

  if (!onElegir) {
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={`${valor} de 5 estrellas`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <LuStar key={n} aria-hidden="true" className={`${clase} ${n <= valor ? 'fill-trigo-suave text-trigo' : 'text-borde'}`} />
        ))}
      </span>
    )
  }

  return (
    <div role="radiogroup" aria-label="Calificación de la entrega" className="flex flex-wrap items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${ETIQUETAS[n - 1]}`}
          onClick={() => onElegir(n)}
          className="grid h-12 w-12 place-items-center rounded-xl transition hover:bg-tarjeta-hover"
        >
          <LuStar aria-hidden="true" className={`${clase} ${n <= valor ? 'fill-trigo-suave text-trigo' : 'text-borde-fuerte'}`} />
        </button>
      ))}
      {valor > 0 && <span className="ml-1 text-sm font-semibold text-texto">{ETIQUETAS[valor - 1]}</span>}
    </div>
  )
}
