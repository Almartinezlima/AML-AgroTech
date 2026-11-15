'use client'
import { useMemo, useState } from 'react'
import { Aviso, AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseBoton, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { costoPromedio, valoresLinea } from '@/lib/abastecimiento/ordenes'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { formatoBs } from '@/lib/utils'
import type { LineaOrdenAdmin, OrdenCompraAdmin } from '@/types/abastecimiento'

// "= 60 litros · costo Bs. 80,00/litro · stock 12 → 72 · costo promedio Bs. 70,00 → Bs. 78,33".
// Dos líneas del mismo producto se encadenan (la segunda parte del resultado de la primera).
function vistasPrevias(lineas: LineaOrdenAdmin[], recibidas: Record<string, string>) {
  const estado = new Map<string, { stock: number; promedio: number | null }>()
  return lineas.map((l) => {
    const v = valoresLinea(l)
    const recibida = Number(recibidas[l.id])
    const antes = estado.get(l.producto_id) ?? { stock: l.stock, promedio: l.costo_promedio }
    if (!Number.isInteger(recibida) || recibida < 0 || recibida > l.cantidad) return { id: l.id, texto: `Va de 0 a ${l.cantidad}.`, valida: false }
    if (recibida === 0) return { id: l.id, texto: `No llegó: faltan ${l.cantidad}.`, valida: true }
    const unidades = recibida * v.unidades
    const despues = { stock: antes.stock + unidades, promedio: costoPromedio(antes.stock, antes.promedio, unidades, v.costoUnidad) }
    estado.set(l.producto_id, despues)
    const promedioAntes = antes.promedio === null ? 'sin costo' : formatoBs(antes.promedio)
    return {
      id: l.id,
      valida: true,
      texto:
        `= ${cantidadConUnidad(unidades, v.unidad)} · costo ${formatoBs(v.costoUnidad)}/${v.unidad.split(' ')[0]} · ` +
        `stock ${antes.stock} → ${despues.stock} · costo promedio ${promedioAntes} → ${formatoBs(despues.promedio)}` +
        (recibida < l.cantidad ? ` · faltan ${l.cantidad - recibida}` : ''),
    }
  })
}

// Recepción única que cierra la orden: lo que llegó de cada línea (de 0 a lo pedido)
export default function ModalRecepcion({ orden, onCerrar, onHecho }: { orden: OrdenCompraAdmin; onCerrar: () => void; onHecho: () => void }) {
  const [recibidas, setRecibidas] = useState<Record<string, string>>(() => Object.fromEntries(orden.lineas.map((l) => [l.id, String(l.cantidad)])))
  const [nota, setNota] = useState('')
  const [confirmarVacia, setConfirmarVacia] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const vistas = useMemo(() => vistasPrevias(orden.lineas, recibidas), [orden.lineas, recibidas])
  const validas = vistas.every((v) => v.valida)
  const nadaLlego = orden.lineas.every((l) => Number(recibidas[l.id]) === 0)

  const registrar = async () => {
    if (nadaLlego && !confirmarVacia) {
      setConfirmarVacia(true)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await enviarJson(`/api/ordenes-compra/${orden.id}/recibir`, 'POST', {
        lineas: orden.lineas.map((l) => ({ item_id: l.id, cantidad_recibida: Number(recibidas[l.id]) })),
        nota: nota.trim() || undefined,
      })
      onHecho()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Recibir ${orden.codigo}`} bloqueado={guardando} onCerrar={onCerrar}>
      <form onSubmit={(e) => { e.preventDefault(); void registrar() }} className="flex flex-col gap-4">
        <p className="text-sm text-texto-2">Cuenta lo que llegó. Si falta algo, pon lo que llegó: el resto queda anotado como faltante. La orden se cierra con esta recepción.</p>
        <AvisoError mensaje={error} />

        <ul className="flex flex-col gap-4">
          {orden.lineas.map((l, i) => {
            const v = valoresLinea(l)
            return (
              <li key={l.id} className="flex flex-col gap-1.5 rounded-xl border border-borde p-3">
                <p className="font-semibold text-texto break-words">{l.producto?.nombre}</p>
                <label htmlFor={`rec-${l.id}`} className="text-sm text-texto-2">
                  {v.nombre}: llegaron (de {l.cantidad})
                </label>
                <input id={`rec-${l.id}`} type="number" inputMode="numeric" min={0} max={l.cantidad} value={recibidas[l.id]}
                  onChange={(e) => { setConfirmarVacia(false); setRecibidas((r) => ({ ...r, [l.id]: e.target.value })) }} className={`${claseInput} max-w-32`} />
                <p className={`text-sm tabular-nums ${vistas[i].valida ? 'text-texto' : 'text-estado-error-texto'}`}>{vistas[i].texto}</p>
              </li>
            )
          })}
        </ul>

        <div>
          <label htmlFor="nota-recepcion" className={claseEtiqueta}>Nota (opcional)</label>
          <textarea id="nota-recepcion" rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} className={claseInput} placeholder="Ej.: una bolsa llegó rota" />
        </div>

        {confirmarVacia && (
          <Aviso tipo="advertencia">No llegó nada: se registra todo como faltante. La orden queda recibida, sin entradas al inventario ni cambio de costo.</Aviso>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={onCerrar} disabled={guardando} className={claseBoton('secundario')}>Volver</button>
          <button type="submit" disabled={guardando || !validas} className={claseBoton('primario')}>
            {guardando ? 'Guardando…' : confirmarVacia ? 'Sí, registrar todo como faltante' : 'Registrar recepción'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
