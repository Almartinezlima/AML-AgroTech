'use client'
import { useState } from 'react'
import Image from 'next/image'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError, pedirApi } from '@/lib/api/cliente'
import type { Categoria, Producto } from '@/types/comercio'

const MAX_BYTES = 2 * 1024 * 1024

interface ModalProductoProps {
  producto: Producto | null
  categorias: Categoria[]
  onCerrar: () => void
  onGuardado: () => void
}

export default function ModalProducto({ producto, categorias, onCerrar, onGuardado }: ModalProductoProps) {
  const [form, setForm] = useState({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto ? String(producto.precio) : '',
    stock_minimo: producto ? String(producto.stock_minimo) : '10',
    unidad: producto?.unidad ?? 'unidad',
    categoria_id: producto?.categoria_id ?? '',
    imagen_url: producto?.imagen_url ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const cambiar = (cambios: Partial<typeof form>) => setForm((f) => ({ ...f, ...cambios }))

  const subirImagen = async (archivo: File | undefined) => {
    if (!archivo) return
    if (archivo.size > MAX_BYTES) return setError('La imagen supera el máximo de 2 MB.')

    setSubiendo(true)
    setError('')
    try {
      const formulario = new FormData()
      formulario.append('archivo', archivo)
      const { url } = await pedirApi<{ url: string }>('/api/productos/imagen', { method: 'POST', body: formulario })
      cambiar({ imagen_url: url })
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setSubiendo(false)
    }
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const categoria = categorias.find((c) => c.id === form.categoria_id)
    const cuerpo = {
      sku: form.sku.trim() || null,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio: Number(form.precio),
      stock_minimo: Number(form.stock_minimo),
      unidad: form.unidad.trim(),
      categoria_id: form.categoria_id,
      imagen_url: form.imagen_url || null,
      ...(producto ? {} : { icono: categoria?.icono ?? '📦' }),
    }

    try {
      if (producto) await enviarJson(`/api/productos/${producto.id}`, 'PATCH', cuerpo)
      else await enviarJson('/api/productos', 'POST', cuerpo)
      onGuardado()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={producto ? 'Editar producto' : 'Nuevo producto'} bloqueado={guardando} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <AvisoError mensaje={error} />

        <div>
          <label htmlFor="p-categoria" className={claseEtiqueta}>Categoría</label>
          <select id="p-categoria" required value={form.categoria_id} onChange={(e) => cambiar({ categoria_id: e.target.value })} className={claseInput}>
            <option value="">Selecciona una categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
        </div>
        <div><label htmlFor="p-nombre" className={claseEtiqueta}>Nombre</label><input id="p-nombre" required maxLength={150} value={form.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} className={claseInput} /></div>
        <div><label htmlFor="p-desc" className={claseEtiqueta}>Descripción</label><textarea id="p-desc" rows={3} maxLength={1000} value={form.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} className={`${claseInput} resize-none`} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label htmlFor="p-sku" className={claseEtiqueta}>SKU</label><input id="p-sku" maxLength={30} value={form.sku} onChange={(e) => cambiar({ sku: e.target.value })} className={claseInput} /></div>
          <div><label htmlFor="p-precio" className={claseEtiqueta}>Precio (Bs.)</label><input id="p-precio" required type="number" min="0.01" step="0.01" value={form.precio} onChange={(e) => cambiar({ precio: e.target.value })} className={claseInput} /></div>
          <div><label htmlFor="p-unidad" className={claseEtiqueta}>Unidad</label><input id="p-unidad" required maxLength={30} value={form.unidad} onChange={(e) => cambiar({ unidad: e.target.value })} className={claseInput} /></div>
          <div><label htmlFor="p-minimo" className={claseEtiqueta}>Stock mínimo</label><input id="p-minimo" required type="number" min="0" value={form.stock_minimo} onChange={(e) => cambiar({ stock_minimo: e.target.value })} className={claseInput} /></div>
        </div>

        <div>
          <label htmlFor="p-imagen" className={claseEtiqueta}>Imagen (JPG, PNG o WEBP, máximo 2 MB)</label>
          {form.imagen_url && (
            <div className="relative h-32 w-32 rounded-xl overflow-hidden mb-2">
              <Image src={form.imagen_url} alt="Vista previa" fill sizes="128px" className="object-cover" />
            </div>
          )}
          <input id="p-imagen" type="file" accept="image/jpeg,image/png,image/webp" disabled={subiendo} onChange={(e) => void subirImagen(e.target.files?.[0])}
            className="text-texto-2 text-sm w-full min-w-0 file:mr-3 file:bg-tarjeta-hover file:border file:border-borde file:text-texto file:rounded-lg file:px-3 file:py-2" />
          {subiendo && <p className="text-texto-2 text-xs mt-1">Subiendo imagen...</p>}
        </div>

        {!producto && <p className="text-texto-2 text-xs">El producto se crea con stock 0. Luego registra una entrada en Inventario.</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" disabled={guardando} onClick={onCerrar} className={claseBotonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando || subiendo} className={claseBotonPrimario}>{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  )
}
