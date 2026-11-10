// El estado siempre lleva texto: el color nunca es la única señal
export default function Insignia({ info }: { info: { etiqueta: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ring-1 ring-inset"
      style={{ color: info.color, backgroundColor: `${info.color}1f`, ['--tw-ring-color' as string]: `${info.color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.color }} aria-hidden="true" />
      {info.etiqueta}
    </span>
  )
}
