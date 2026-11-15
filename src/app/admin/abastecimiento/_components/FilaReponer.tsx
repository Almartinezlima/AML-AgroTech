import Insignia from '@/components/ui/Insignia'
import { claseInput, claseTarjeta } from '@/components/ui/estilos'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { formatoBs } from '@/lib/utils'
import type { ProductoReponer } from '@/types/abastecimiento'

export interface Eleccion {
  incluir: boolean
  presentacion_id: string
  cantidad: string
}

interface FilaReponerProps {
  producto: ProductoReponer
  eleccion: Eleccion | undefined
  onCambiar: (cambios: Partial<Eleccion>) => void
}

const INSIGNIA_AGOTADO = { etiqueta: 'Agotado', color: '#ef4444' }
const INSIGNIA_MINIMO = { etiqueta: 'En el mínimo', color: '#f59e0b' }
const INSIGNIA_CERCA = { etiqueta: 'Cerca del mínimo', color: '#f59e0b' }

// Un producto para pedir: proveedor (el más barato primero), cuántas presentaciones y en qué se convierte
export default function FilaReponer({ producto: p, eleccion, onCambiar }: FilaReponerProps) {
  const opcion = p.opciones.find((o) => o.presentacion_id === eleccion?.presentacion_id) ?? p.opciones[0]
  const cantidad = Number(eleccion?.cantidad)
  const valida = Number.isInteger(cantidad) && cantidad >= 1
  const insignia = p.stock === 0 ? INSIGNIA_AGOTADO : p.stock <= p.stock_minimo ? INSIGNIA_MINIMO : p.para_reponer ? INSIGNIA_CERCA : null
  const idCampo = `cantidad-${p.id}`

  return (
    <li className={`${claseTarjeta} flex flex-col gap-3 p-4 ${eleccion?.incluir ? 'border-acento ring-1 ring-acento/30' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <label className="flex min-h-11 min-w-0 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={Boolean(eleccion?.incluir)}
            disabled={!opcion}
            onChange={(e) => onCambiar({ incluir: e.target.checked })}
            className="mt-1 h-5 w-5 shrink-0 accent-acento"
            aria-label={`Pedir ${p.nombre}`}
          />
          <span className="min-w-0">
            <span className="block font-semibold text-texto break-words">{p.nombre}</span>
            <span className="block text-sm text-texto-2 tabular-nums">
              Stock {cantidadConUnidad(p.stock, p.unidad)} · mínimo {p.stock_minimo}{p.sku ? ` · ${p.sku}` : ''}
            </span>
          </span>
        </label>
        {insignia && <Insignia info={insignia} />}
      </div>

      {!opcion ? (
        <p className="text-sm text-estado-pendiente-texto">Ningún proveedor lo vende todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="min-w-0">
            <label htmlFor={`prov-${p.id}`} className="mb-1 block text-sm text-texto-2">Proveedor y presentación</label>
            <select
              id={`prov-${p.id}`}
              value={opcion.presentacion_id}
              onChange={(e) => onCambiar({ presentacion_id: e.target.value })}
              className={claseInput}
            >
              {p.opciones.map((o, i) => (
                <option key={o.presentacion_id} value={o.presentacion_id}>
                  {o.distribuidor} · {o.nombre} · {formatoBs(o.costo_por_unidad)}/{p.unidad}{i === 0 ? ' (más barato)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={idCampo} className="mb-1 block text-sm text-texto-2">Cantidad</label>
            <input
              id={idCampo}
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              value={eleccion?.cantidad ?? ''}
              onChange={(e) => onCambiar({ cantidad: e.target.value, incluir: true })}
              className={claseInput}
            />
          </div>
          <p className="text-sm text-texto-2 sm:col-span-2 tabular-nums">
            {valida ? (
              <>
                = <span className="font-semibold text-acento">{cantidadConUnidad(cantidad * opcion.unidades_por_presentacion, p.unidad)}</span>
                {' '}· {formatoBs(cantidad * opcion.precio_mayorista)} · stock {p.stock} → {p.stock + cantidad * opcion.unidades_por_presentacion}
              </>
            ) : (
              'Pide al menos 1.'
            )}
          </p>
        </div>
      )}
    </li>
  )
}
