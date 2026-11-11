// Texto oscuro de cada color de estado para que se lea sobre fondo claro (AA)
export const colorTextoEstado = (color: string) => TEXTO_OSCURO[color.toLowerCase()] ?? color

const TEXTO_OSCURO: Record<string, string> = {
  '#f59e0b': '#92400e',
  '#22c55e': '#166534',
  '#3b82f6': '#1d4ed8',
  '#ef4444': '#b91c1c',
}

// El estado siempre lleva texto: el color nunca es la única señal
export default function Insignia({ info }: { info: { etiqueta: string; color: string } }) {
  const texto = colorTextoEstado(info.color)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ring-1 ring-inset"
      style={{ color: texto, backgroundColor: `${info.color}1a`, ['--tw-ring-color' as string]: `${info.color}55` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.color }} aria-hidden="true" />
      {info.etiqueta}
    </span>
  )
}
