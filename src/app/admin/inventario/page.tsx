'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import { claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_NIVEL, nivelStock, type NivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'

type Filtro = NivelStock | 'todos'
const FILTROS: Array<{ valor: Filtro; texto: string }> = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'normal', texto: 'Normal' },
  { valor: 'bajo', texto: 'Bajo' },
  { valor: 'agotado', texto: 'Agotado' },
]

export default function AdminInventarioPage() {
  const { datos, cargando, error, recargar } = useDatosApi<Producto[]>('/api/productos?alcance=todos')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [producto, setProducto] = useState<Producto | null>(null)
  const [tipo, setTipo] = useState<'entrada' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  const cerrar = useCallback(() => setProducto(null), [])

  const activos = (datos ?? []).filter((p) => p.activo)
  const visibles = activos
    .filter((p) => filtro === 'todos' || nivelStock(p.stock, p.stock_minimo) === filtro)
    .sort((a, b) => a.stock - b.stock)
  const valor = activos.reduce((suma, p) => suma + p.stock * p.precio, 0)

  const abrir = (p: Producto) => {
    setProducto(p)
    setTipo('entrada')
    setCantidad('')
    setMotivo('')
    setErrorForm('')
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!producto) return
    setGuardando(true)
    setErrorForm('')
    try {
      await enviarJson('/api/inventario/movimientos', 'POST', {
        producto_id: producto.id,
        tipo,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
      })
      setProducto(null)
      await recargar()
    } catch (causa) {
      setErrorForm(mensajeDeError(causa))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4]">Inventario</h1>
        <p className="text-[#86efac] mt-1 mb-6">{activos.length} productos · Valor: {formatoBs(valor)}</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTROS.map((f) => (
            <button key={f.valor} onClick={() => setFiltro(f.valor)} aria-pressed={filtro === f.valor}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filtro === f.valor ? 'bg-[#22c55e] text-[#0a0f0a]' : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'}`}>
              {f.texto}
            </button>
          ))}
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : visibles.length === 0 ? (
          <BloqueVacio icono="🏬" mensaje="No hay productos en este nivel" />
        ) : (
          <ul className="flex flex-col gap-3">
            {visibles.map((p) => (
              <li key={p.id} className={`${claseTarjeta} p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[#f0fdf4] font-semibold text-sm break-words">{p.icono} {p.nombre}</p>
                    <p className="text-[#86efac] text-xs">{p.sku ?? 'Sin SKU'} · {p.categorias?.nombre}</p>
                  </div>
                  <Insignia info={INFO_NIVEL[nivelStock(p.stock, p.stock_minimo)]} />
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
                  <p className="text-[#f0fdf4] text-sm"><span className="font-bold text-lg">{p.stock}</span> <span className="text-[#86efac]">{p.unidad} · mín. {p.stock_minimo}</span></p>
                  <div className="flex gap-2">
                    <Link href={`/admin/inventario/${p.id}`} className={`${claseBotonSecundario} !px-3 !py-2 text-sm`}>Kardex</Link>
                    <button onClick={() => abrir(p)} className={`${claseBotonPrimario} !px-3 !py-2 text-sm`}>Movimiento</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {producto && (
        <Modal titulo={`Movimiento: ${producto.nombre}`} bloqueado={guardando} onCerrar={cerrar}>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <AvisoError mensaje={errorForm} />
            <p className="text-[#86efac] text-sm">Stock actual: {producto.stock} {producto.unidad}</p>
            <div>
              <label htmlFor="m-tipo" className={claseEtiqueta}>Tipo</label>
              <select id="m-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'entrada' | 'ajuste')} className={claseInput}>
                <option value="entrada">Entrada (compra a proveedor)</option>
                <option value="ajuste">Ajuste (pérdida, vencimiento, conteo)</option>
              </select>
            </div>
            <div>
              <label htmlFor="m-cantidad" className={claseEtiqueta}>{tipo === 'ajuste' ? 'Cantidad (negativa para restar)' : 'Cantidad'}</label>
              <input id="m-cantidad" required type="number" step="1" min={tipo === 'entrada' ? 1 : undefined} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={claseInput} />
            </div>
            <div>
              <label htmlFor="m-motivo" className={claseEtiqueta}>Motivo</label>
              <input id="m-motivo" required minLength={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" disabled={guardando} onClick={cerrar} className={claseBotonSecundario}>Cancelar</button>
              <button type="submit" disabled={guardando} className={claseBotonPrimario}>{guardando ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
