'use client'
import { useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { AvisoError } from '@/components/ui/Estados'
import { claseBoton, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { costoPorUnidad, cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { valoresLinea } from '@/lib/abastecimiento/ordenes'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { formatoBs } from '@/lib/utils'
import type { OrdenCompraAdmin } from '@/types/abastecimiento'

// Borrador: cambiar cantidades, quitar líneas (quedan en 0) y sumar otras presentaciones del proveedor
export default function EditorBorrador({ orden, onCambio }: { orden: OrdenCompraAdmin; onCambio: () => void }) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [nueva, setNueva] = useState({ presentacion_id: '', cantidad: '1' })
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState('')

  const guardar = async (clave: string, presentacion_id: string, cantidad: number) => {
    setGuardando(clave)
    setError('')
    try {
      await enviarJson(`/api/ordenes-compra/${orden.id}/lineas`, 'PATCH', { presentacion_id, cantidad })
      setCantidades((c) => ({ ...c, [clave]: '' }))
      if (clave === 'nueva') setNueva({ presentacion_id: '', cantidad: '1' })
      onCambio()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setGuardando(null)
    }
  }

  const activas = orden.lineas.filter((l) => l.cantidad > 0)
  const quitadas = orden.lineas.filter((l) => l.cantidad === 0)
  const enOrden = new Set(activas.map((l) => l.presentacion_id))
  const paraSumar = orden.presentaciones_disponibles.filter((p) => !enOrden.has(p.id))

  return (
    <section aria-label="Productos del borrador" className={`${claseTarjeta} flex flex-col gap-4 p-4 sm:p-5`}>
      <AvisoError mensaje={error} />
      {activas.length === 0 && <p className="text-sm text-texto-2">El borrador no tiene productos. Suma alguno abajo.</p>}

      <ul className="flex flex-col divide-y divide-borde">
        {activas.map((l) => {
          const v = valoresLinea(l)
          const texto = cantidades[l.id] || String(l.cantidad)
          const cantidad = Number(texto)
          const cambiada = cantidades[l.id] !== undefined && cantidades[l.id] !== '' && cantidad !== l.cantidad
          return (
            <li key={l.id} className="flex flex-col gap-2 py-3 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="font-semibold text-texto break-words">{l.producto?.nombre}</p>
                  <p className="text-sm text-texto-2 break-words">{v.nombre} · {formatoBs(v.precio)} · {formatoBs(v.costoUnidad)} por {v.unidad}</p>
                </div>
                <p className="font-semibold tabular-nums text-texto">{formatoBs(v.precio * (Number.isFinite(cantidad) ? cantidad : 0))}</p>
              </div>
              {l.presentacion && (!l.presentacion.activo || !l.presentacion.disponible) && (
                <p className="text-sm text-estado-error-texto">El proveedor ya no la tiene disponible: quítala antes de enviar.</p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-28">
                  <label htmlFor={`cant-${l.id}`} className="mb-1 block text-sm text-texto-2">Cantidad</label>
                  <input id={`cant-${l.id}`} type="number" inputMode="numeric" min={1} max={100000} value={texto}
                    onChange={(e) => setCantidades((c) => ({ ...c, [l.id]: e.target.value }))} className={claseInput} />
                </div>
                {cambiada && Number.isInteger(cantidad) && cantidad >= 1 && (
                  <button type="button" disabled={guardando !== null} onClick={() => void guardar(l.id, l.presentacion_id, cantidad)} className={claseBoton('primario', 'chico')}>
                    {guardando === l.id ? 'Guardando…' : 'Guardar'}
                  </button>
                )}
                <button type="button" disabled={guardando !== null} onClick={() => void guardar(l.id, l.presentacion_id, 0)} className={claseBoton('peligro', 'chico')}>
                  Quitar
                </button>
              </div>
              {Number.isInteger(cantidad) && cantidad >= 1 && (
                <p className="text-sm text-texto-2">= {cantidadConUnidad(cantidad * v.unidades, v.unidad)}</p>
              )}
            </li>
          )
        })}
      </ul>

      {quitadas.length > 0 && (
        <p className="text-sm text-texto-2">
          Quitadas (no se envían): {quitadas.map((l) => `${l.producto?.nombre} · ${valoresLinea(l).nombre}`).join('; ')}
        </p>
      )}

      {paraSumar.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-borde pt-4">
          <p className={claseTituloSeccion}>Sumar otro producto de este proveedor</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
            <div className="min-w-0">
              <label htmlFor="sumar-pres" className="mb-1 block text-sm text-texto-2">Presentación</label>
              <select id="sumar-pres" value={nueva.presentacion_id} onChange={(e) => setNueva((n) => ({ ...n, presentacion_id: e.target.value }))} className={claseInput}>
                <option value="">Elige una presentación</option>
                {paraSumar.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productos?.nombre} · {p.nombre} · {formatoBs(costoPorUnidad(p.precio_mayorista, p.unidades_por_presentacion))}/{p.productos?.unidad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sumar-cant" className="mb-1 block text-sm text-texto-2">Cantidad</label>
              <input id="sumar-cant" type="number" inputMode="numeric" min={1} max={100000} value={nueva.cantidad}
                onChange={(e) => setNueva((n) => ({ ...n, cantidad: e.target.value }))} className={claseInput} />
            </div>
            <button type="button" disabled={!nueva.presentacion_id || !(Number(nueva.cantidad) >= 1) || guardando !== null}
              onClick={() => void guardar('nueva', nueva.presentacion_id, Number(nueva.cantidad))} className={claseBoton('secundario')}>
              <LuPlus className="h-4 w-4" aria-hidden="true" /> Sumar
            </button>
          </div>
        </div>
      )}

      <p className="flex justify-between gap-3 border-t border-borde pt-4 text-texto">
        <span className="font-semibold">Total con los precios de hoy</span>
        <span className="font-titulo text-xl font-bold tabular-nums">{formatoBs(orden.total)}</span>
      </p>
    </section>
  )
}
