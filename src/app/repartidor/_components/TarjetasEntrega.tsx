import Link from 'next/link'
import ContactoCliente from '@/components/entrega/ContactoCliente'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseTarjeta } from '@/components/ui/estilos'
import { INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { EntregaDisponible, EntregaMia } from '@/types/entrega'
import { LuBox, LuHandshake, LuLock, LuMapPin, LuStore } from 'react-icons/lu'

// Botones grandes: cómodos en la calle, con el celular en una mano (56 px)
const BOTON_GRANDE = `${claseBoton('primario')} w-full min-h-14 text-lg`

function Destino({ zona, direccion, notas }: { zona: string | null; direccion: string | null; notas?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-texto">
      <LuMapPin className="mt-1 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold break-words">{zona ?? '—'}</p>
        {direccion && <p className="break-words">{direccion}</p>}
        {notas && <p className="mt-1 text-sm text-texto-2 break-words">Nota: {notas}</p>}
      </div>
    </div>
  )
}

function Bultos({ bultos }: { bultos: number | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-texto-2">
      <LuBox className="h-4 w-4" aria-hidden="true" /> {bultos ?? '—'} {bultos === 1 ? 'bulto' : 'bultos'}
    </span>
  )
}

function Ganas({ monto }: { monto: number }) {
  return (
    <p className="font-titulo text-2xl font-bold tabular-nums text-acento">Ganas {formatoBs(monto)}</p>
  )
}

// Entrega disponible: sin nombre ni teléfono del cliente hasta aceptarla
export function TarjetaDisponible({ entrega, procesando, onAceptar }: { entrega: EntregaDisponible; procesando: boolean; onAceptar: () => void }) {
  return (
    <article className={`${claseTarjeta} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Ganas monto={entrega.ganas} />
        <Bultos bultos={entrega.bultos} />
      </div>
      <Destino zona={entrega.zona} direccion={entrega.direccion_entrega} />
      {entrega.empacado_en && <p className="text-sm text-texto-2">Listo en la tienda desde las {diaHora(entrega.empacado_en)}</p>}
      <button type="button" disabled={procesando} onClick={onAceptar} className={BOTON_GRANDE}>
        <LuHandshake className="h-5 w-5" aria-hidden="true" /> Aceptar
      </button>
    </article>
  )
}

// Entrega que aceptó: primero la recoge en la tienda, después la entrega con el código del cliente
export function TarjetaMia({ entrega, procesando, onRecoger }: { entrega: EntregaMia; procesando: boolean; onRecoger: () => void }) {
  const enCamino = entrega.estado === 'despachado'

  return (
    <article className={`${claseTarjeta} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-titulo text-xl font-bold text-texto">{entrega.codigo}</p>
          <p className="text-sm text-texto-2">
            {enCamino && entrega.despachado_en ? `Saliste a las ${diaHora(entrega.despachado_en)}` : `Aceptada a las ${diaHora(entrega.aceptado_en)}`}
          </p>
        </div>
        <Insignia info={enCamino ? INFO_ESTADO_PEDIDO.despachado : { etiqueta: 'Recoger en tienda', color: INFO_ESTADO_PEDIDO.empacado.color }} />
      </div>

      <Destino zona={entrega.zona} direccion={entrega.direccion_entrega} notas={entrega.notas} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-texto">
        <span className="font-semibold break-words">{entrega.cliente ?? 'Cliente'}</span>
        <Bultos bultos={entrega.bultos} />
        <span className="font-semibold tabular-nums text-acento">Ganas {formatoBs(entrega.ganas)}</span>
      </div>

      {entrega.codigo_bloqueado && (
        <p className="inline-flex items-center gap-2 self-start rounded-xl bg-estado-pendiente/10 px-3 py-2 text-sm font-semibold text-estado-pendiente-texto">
          <LuLock className="h-4 w-4" aria-hidden="true" /> Código bloqueado: avisa a la tienda
        </p>
      )}

      <ContactoCliente telefono={entrega.telefono} codigoPedido={entrega.codigo} />

      {enCamino ? (
        <Link href={`/repartidor/pedidos/${entrega.id}`} className={BOTON_GRANDE}>
          <LuHandshake className="h-5 w-5" aria-hidden="true" /> Entregar
        </Link>
      ) : (
        <button type="button" disabled={procesando} onClick={onRecoger} className={BOTON_GRANDE}>
          <LuStore className="h-5 w-5" aria-hidden="true" /> Recogí el pedido
        </button>
      )}
    </article>
  )
}
