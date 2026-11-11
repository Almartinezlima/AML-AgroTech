'use client'
import { LuClock, LuMapPin } from 'react-icons/lu'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ETIQUETA_TIPO_ZONA, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { ZonaEnvio } from '@/types/comercio'

// Zonas de envío reales (de la base). Si falla, la sección se oculta y la portada sigue.
export default function ZonasPortada() {
  const { datos, cargando, error } = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')

  if (cargando) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" role="status" aria-label="Cargando">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="esqueleto h-36 rounded-2xl border border-borde" />)}
      </div>
    )
  }
  if (error || !datos?.length) {
    return <p className="text-texto-2">Consulta las zonas de envío al finalizar tu compra.</p>
  }

  return (
    <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {datos.map((z) => (
        <li key={z.id} className={`flex h-full flex-col rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${z.tipo === 'provincia' ? 'border-trigo/30 bg-gradient-to-br from-[#fbf4e2] to-tarjeta' : 'border-borde bg-tarjeta'}`}>
          <p className={`inline-flex items-center gap-1.5 text-xs font-semibold ${z.tipo === 'provincia' ? 'text-trigo' : 'text-texto-2'}`}>
            <LuMapPin className="h-3.5 w-3.5" aria-hidden="true" /> {ETIQUETA_TIPO_ZONA[z.tipo]}
          </p>
          <h3 className="mt-2 font-titulo text-lg font-bold leading-tight text-texto">{z.nombre}</h3>
          <p className="mt-auto pt-3 font-titulo text-2xl font-bold tabular-nums text-acento">{z.costo === 0 ? 'Gratis' : formatoBs(z.costo)}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-texto-2">
            <LuClock className="h-3.5 w-3.5" aria-hidden="true" /> {tiempoEntrega(z)}
          </p>
        </li>
      ))}
    </ul>
  )
}
