// El estado siempre lleva texto: el color nunca es la única señal
export default function Insignia({ info }: { info: { etiqueta: string; color: string } }) {
  return (
    <span
      className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: info.color, backgroundColor: `${info.color}22` }}
    >
      {info.etiqueta}
    </span>
  )
}
