import { InsigniaTendencia } from '@/components/InsigniasFicha'
import { formatoFechaCorta } from '@/lib/ecommerce/fichaTecnica'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

// Tendencia del mercado y precio de referencia con su fuente (no es nuestro precio)
export default function PrecioMercado({ producto }: { producto: Producto }) {
  const { tendencia_precio: tendencia, precio_referencia: referencia, fuente_precio: fuente, fecha_precio: fecha } = producto
  if (!tendencia && referencia == null) return null

  const origen = [fuente, fecha ? formatoFechaCorta(fecha) : null].filter(Boolean).join(', ')

  return (
    <div className="-mt-2 flex flex-col items-start gap-2">
      {tendencia && <InsigniaTendencia tendencia={tendencia} />}
      {referencia != null && (
        <p className="max-w-prose text-sm text-texto-2">
          Referencia de mercado: <span className="font-semibold tabular-nums text-texto">{formatoBs(referencia)}</span>
          {origen && ` (${origen})`}. Nuestro precio incluye el flete hasta Villa Charcas.
        </p>
      )}
    </div>
  )
}
