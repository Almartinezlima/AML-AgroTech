'use client'
import { useMemo, useState } from 'react'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { costoPorUnidad } from '@/lib/abastecimiento/presentacion'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { formatoBs } from '@/lib/utils'
import type { Presentacion } from '@/types/abastecimiento'

export interface ProductoTienda {
  id: string
  nombre: string
  sku: string | null
  unidad: string
}

interface ModalPresentacionProps {
  presentacion: Presentacion | null // null = nueva
  productos: ProductoTienda[]
  diasFicha: number
  onCerrar: () => void
  onGuardado: () => void
}

// Alta y edición de una presentación mayorista. La pregunta de las unidades se hace en la
// unidad de venta de la tienda ("¿Cuántos litro trae?"): eso es el fraccionamiento.
export default function ModalPresentacion({ presentacion, productos, diasFicha, onCerrar, onGuardado }: ModalPresentacionProps) {
  const [form, setForm] = useState({
    producto_id: presentacion?.producto_id ?? '',
    nombre: presentacion?.nombre ?? '',
    unidades: presentacion ? String(presentacion.unidades_por_presentacion) : '',
    precio: presentacion ? String(presentacion.precio_mayorista) : '',
    disponible: presentacion?.disponible ?? true,
    dias: presentacion?.dias_entrega == null ? '' : String(presentacion.dias_entrega),
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const cambiar = (cambios: Partial<typeof form>) => setForm((f) => ({ ...f, ...cambios }))

  const producto = useMemo(
    () => (presentacion?.productos ? { unidad: presentacion.productos.unidad } : productos.find((p) => p.id === form.producto_id)),
    [presentacion, productos, form.producto_id]
  )
  const unidad = producto?.unidad ?? 'unidad'
  const unidades = Number(form.unidades)
  const precio = Number(form.precio)
  const vistaCosto = unidades >= 1 && precio > 0 ? `${formatoBs(costoPorUnidad(precio, unidades))} por ${unidad}` : null

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    const cuerpo = {
      nombre: form.nombre,
      unidades_por_presentacion: unidades,
      precio_mayorista: precio,
      disponible: form.disponible,
      dias_entrega: form.dias === '' ? null : Number(form.dias),
    }
    try {
      if (presentacion) await enviarJson(`/api/distribuidor/presentaciones/${presentacion.id}`, 'PATCH', cuerpo)
      else await enviarJson('/api/distribuidor/presentaciones', 'POST', { ...cuerpo, producto_id: form.producto_id })
      onGuardado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={presentacion ? 'Editar presentación' : 'Nueva presentación'} bloqueado={guardando} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <AvisoError mensaje={error} />

        {presentacion ? (
          <p className="rounded-xl border border-borde bg-tarjeta-hover px-4 py-3 text-sm text-texto">
            <span className="text-texto-2">Producto de la tienda:</span> <span className="font-semibold">{presentacion.productos?.nombre}</span>
          </p>
        ) : (
          <div>
            <label htmlFor="p-producto" className={claseEtiqueta}>Producto de la tienda</label>
            <select id="p-producto" required value={form.producto_id} onChange={(e) => cambiar({ producto_id: e.target.value })} className={claseInput}>
              <option value="">Elige el producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} (se vende por {p.unidad})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="p-nombre" className={claseEtiqueta}>Presentación</label>
          <input id="p-nombre" required minLength={2} maxLength={80} value={form.nombre} onChange={(e) => cambiar({ nombre: e.target.value })}
            placeholder="Ej: Bidón 20 L, Bolsa 25 kg, Caja 12 × 1 L" className={claseInput} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-unidades" className={claseEtiqueta}>¿Cuántos «{unidad}» trae?</label>
            <input id="p-unidades" required type="number" inputMode="numeric" min="1" step="1" value={form.unidades}
              onChange={(e) => cambiar({ unidades: e.target.value })} className={claseInput} />
            <p className={claseAyuda}>En la unidad en que la tienda lo vende. Un bidón de 20 L de un producto por litro trae 20.</p>
          </div>
          <div>
            <label htmlFor="p-precio" className={claseEtiqueta}>Precio mayorista (Bs.)</label>
            <input id="p-precio" required type="number" inputMode="decimal" min="0.01" step="0.01" value={form.precio}
              onChange={(e) => cambiar({ precio: e.target.value })} className={claseInput} />
            <p className={claseAyuda} aria-live="polite">{vistaCosto ? `= ${vistaCosto}` : 'Por toda la presentación.'}</p>
          </div>
        </div>

        <div>
          <label htmlFor="p-dias" className={claseEtiqueta}>Días de entrega (opcional)</label>
          <input id="p-dias" type="number" inputMode="numeric" min="0" max="60" step="1" value={form.dias}
            onChange={(e) => cambiar({ dias: e.target.value })} placeholder={`Si lo dejas vacío: ${diasFicha}`} className={claseInput} />
        </div>

        <label className="flex min-h-11 items-center gap-2 text-sm text-texto">
          <input type="checkbox" className="h-5 w-5 accent-acento" checked={form.disponible} onChange={(e) => cambiar({ disponible: e.target.checked })} />
          La tengo disponible para vender
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={guardando} onClick={onCerrar} className={claseBotonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando} className={claseBotonPrimario}>{guardando ? 'Guardando…' : 'Guardar presentación'}</button>
        </div>
      </form>
    </Modal>
  )
}
