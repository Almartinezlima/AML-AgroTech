// Insignia de estado (docs/DISENO.md): punto del color del estado, texto en su tono oscuro (AA)
// y fondo del color al 10 %. Los colores salen de los tokens estado-* de tailwind.config.ts.

type Tono = 'pendiente' | 'ok' | 'camino' | 'error'

// Los estados llegan con su color base (src/lib/ecommerce/presentacion.ts)
const TONO_DE_COLOR: Record<string, Tono> = {
  '#f59e0b': 'pendiente',
  '#22c55e': 'ok',
  '#3b82f6': 'camino',
  '#ef4444': 'error',
}

// Clases escritas completas para que Tailwind las encuentre
const CLASES_TONO: Record<Tono, { caja: string; punto: string; texto: string }> = {
  pendiente: { caja: 'bg-estado-pendiente/10 ring-estado-pendiente/40', punto: 'bg-estado-pendiente', texto: 'text-estado-pendiente-texto' },
  ok: { caja: 'bg-estado-ok/10 ring-estado-ok/40', punto: 'bg-estado-ok', texto: 'text-estado-ok-texto' },
  camino: { caja: 'bg-estado-camino/10 ring-estado-camino/40', punto: 'bg-estado-camino', texto: 'text-estado-camino-texto' },
  error: { caja: 'bg-estado-error/10 ring-estado-error/40', punto: 'bg-estado-error', texto: 'text-estado-error-texto' },
}

const TEXTO_OSCURO: Record<Tono, string> = {
  pendiente: '#92400e',
  ok: '#166534',
  camino: '#1d4ed8',
  error: '#b91c1c',
}

const tonoDe = (color: string): Tono | null => TONO_DE_COLOR[color.toLowerCase()] ?? null

// Texto oscuro de cada color de estado para que se lea sobre fondo claro (AA)
export const colorTextoEstado = (color: string) => {
  const tono = tonoDe(color)
  return tono ? TEXTO_OSCURO[tono] : color
}

// Clase de texto del tono (para estados escritos sin insignia)
export const claseTextoEstado = (color: string) => {
  const tono = tonoDe(color)
  return tono ? CLASES_TONO[tono].texto : 'text-texto-2'
}

// Insignias fijas que no vienen de presentacion.ts (activo / inactivo)
export const INSIGNIA_ACTIVO = { etiqueta: 'Activo', color: '#22c55e' }
export const INSIGNIA_INACTIVO = { etiqueta: 'Inactivo', color: '#ef4444' }

// El estado siempre lleva texto: el color nunca es la única señal
export default function Insignia({ info }: { info: { etiqueta: string; color: string } }) {
  const tono = tonoDe(info.color)
  const base = 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ring-1 ring-inset'

  if (!tono) {
    // Color fuera de los estados conocidos: se pinta igual, con estilo en línea
    return (
      <span className={base} style={{ color: info.color, backgroundColor: `${info.color}1a`, ['--tw-ring-color' as string]: `${info.color}55` }}>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: info.color }} aria-hidden="true" />
        {info.etiqueta}
      </span>
    )
  }

  const clases = CLASES_TONO[tono]
  return (
    <span className={`${base} ${clases.caja} ${clases.texto}`}>
      <span className={`h-2 w-2 rounded-full ${clases.punto}`} aria-hidden="true" />
      {info.etiqueta}
    </span>
  )
}
