'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LuClipboardList } from 'react-icons/lu'
import { Aviso, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseTarjeta } from '@/components/ui/estilos'
import { INFO_ESTADO_ORDEN, fechaCorta } from '@/lib/abastecimiento/ordenes'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { OrdenCompraResumen } from '@/types/abastecimiento'

// Las que todavía piden algo al proveedor; las demás (recibidas, rechazadas, canceladas) quedan
// plegadas en «Ver anteriores» para que el panel no se haga eterno (fase 8A)
const ABIERTAS = new Set(['enviada', 'aceptada', 'despachada'])

// Las órdenes que la tienda le mandó al proveedor (las que esperan respuesta, primero)
export default function OrdenesProveedor() {
  const { datos, cargando, error, recargar } = useDatosApi<OrdenCompraResumen[]>('/api/distribuidor/ordenes')
  const [verAnteriores, setVerAnteriores] = useState(false)
  const ordenes = [...(datos ?? [])].sort((a, b) => Number(b.estado === 'enviada') - Number(a.estado === 'enviada'))
  const abiertas = ordenes.filter((o) => ABIERTAS.has(o.estado))
  const anteriores = ordenes.filter((o) => !ABIERTAS.has(o.estado))
  const visibles = verAnteriores ? [...abiertas, ...anteriores] : abiertas
  const porResponder = ordenes.filter((o) => o.estado === 'enviada').length

  return (
    <section aria-labelledby="titulo-ordenes-proveedor" className="mb-10">
      <h2 id="titulo-ordenes-proveedor" className="mb-3 font-titulo text-xl font-bold text-texto">Órdenes de la tienda</h2>

      {cargando ? (
        <BloqueCarga filas={2} />
      ) : error || !datos ? (
        <BloqueError mensaje={error} onReintentar={() => void recargar()} />
      ) : ordenes.length === 0 ? (
        <div className={`${claseTarjeta} flex items-start gap-3 p-4`}>
          <LuClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-texto-2" aria-hidden="true" />
          <p className="text-sm text-texto-2">Todavía no tienes órdenes. Cuando la tienda te mande una, aparece acá con el botón «Responder». Mientras tanto, revisa que tus presentaciones estén al día y marcadas como disponibles.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {abiertas.length === 0 && (
            <div className={`${claseTarjeta} flex items-start gap-3 p-4`}>
              <LuClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-texto-2" aria-hidden="true" />
              <p className="text-sm text-texto-2">No tienes órdenes pendientes. Cuando la tienda te mande una nueva, aparece acá con el botón «Responder».</p>
            </div>
          )}
          {porResponder > 0 && (
            <Aviso tipo="advertencia">
              {porResponder === 1 ? 'Tienes 1 orden por responder.' : `Tienes ${porResponder} órdenes por responder.`}
            </Aviso>
          )}
          <ul className="flex flex-col gap-3">
            {visibles.map((o) => (
              <li key={o.id} className={`${claseTarjeta} flex flex-col gap-2 p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <p className="font-titulo text-lg font-bold text-texto">{o.codigo}</p>
                  <Insignia info={INFO_ESTADO_ORDEN[o.estado]} />
                </div>
                <p className="text-sm text-texto-2">
                  {o.cantidad_lineas} producto{o.cantidad_lineas === 1 ? '' : 's'}
                  {o.enviada_en ? ` · recibida el ${fechaHora(o.enviada_en)}` : ''}
                  {o.fecha_estimada ? ` · entregas el ${fechaCorta(o.fecha_estimada)}` : ''}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-3">
                  <p className="font-titulo text-lg font-bold tabular-nums text-texto">{formatoBs(o.total)}</p>
                  <Link href={`/distribuidor/ordenes/${o.id}`} className={claseBoton(o.estado === 'enviada' ? 'primario' : 'suave', 'chico')}>
                    {o.estado === 'enviada' ? 'Responder' : 'Ver orden'} {o.codigo}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          {anteriores.length > 0 && (
            <button type="button" onClick={() => setVerAnteriores((v) => !v)} aria-expanded={verAnteriores} className={`${claseBoton('secundario', 'chico')} self-start`}>
              {verAnteriores ? 'Ocultar órdenes anteriores' : `Ver anteriores (${anteriores.length})`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
