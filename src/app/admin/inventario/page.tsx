'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import { claseBoton, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseFilaFiltros, claseFiltro, claseInput, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_NIVEL, nivelStock, type NivelStock } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { Producto } from '@/types/comercio'
import { LuPackageX, LuTriangleAlert, LuWallet, LuWarehouse } from 'react-icons/lu'

type Filtro = NivelStock | 'todos'
const FILTROS: Array<{ valor: Filtro; texto: string }> = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'normal', texto: 'Normal' },
  { valor: 'bajo', texto: 'Bajo' },
  { valor: 'agotado', texto: 'Agotado' },
]

// Columnas de la lista en escritorio: producto | stock | estado | acciones
const COLUMNAS = 'md:grid-cols-[minmax(0,1fr)_8rem_8rem_15rem] md:gap-4'

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
  // Cuántos productos hay en cada nivel (para las cifras y los filtros)
  const cuenta = (nivel: NivelStock) => activos.filter((p) => nivelStock(p.stock, p.stock_minimo) === nivel).length

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
        <EncabezadoAdmin titulo="Inventario" descripcion="Stock de cada producto activo. Registra compras y ajustes, o abre su kardex." />

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <>
            <TarjetasResumen etiqueta="Resumen del inventario" cifras={[
              { titulo: 'Stock bajo', valor: String(cuenta('bajo')), detalle: 'En su mínimo o debajo', icono: LuTriangleAlert, tono: cuenta('bajo') > 0 ? 'pendiente' : 'neutro' },
              { titulo: 'Agotados', valor: String(cuenta('agotado')), detalle: 'Sin unidades', icono: LuPackageX, tono: cuenta('agotado') > 0 ? 'error' : 'neutro' },
              { titulo: 'Valor del inventario', valor: formatoBs(valor), detalle: `${activos.length} productos activos · stock × precio`, icono: LuWallet, tono: 'acento', ancha: true },
            ]} />

            <div role="group" aria-label="Filtrar por nivel de stock" className={`${claseFilaFiltros} mb-4`}>
              {FILTROS.map((f) => (
                <button key={f.valor} onClick={() => setFiltro(f.valor)} aria-pressed={filtro === f.valor} className={claseFiltro(filtro === f.valor)}>
                  {f.texto} <span className="tabular-nums opacity-80">{f.valor === 'todos' ? activos.length : cuenta(f.valor)}</span>
                </button>
              ))}
            </div>

            {visibles.length === 0 ? (
              <BloqueVacio icono={LuWarehouse} mensaje="No hay productos en este nivel" />
            ) : (
              <div className="md:overflow-hidden md:rounded-2xl md:border md:border-borde md:bg-tarjeta md:shadow-tarjeta">
                {/* Encabezado de columnas: solo en escritorio */}
                <div aria-hidden="true" className={`hidden md:grid ${COLUMNAS} border-b border-borde bg-tarjeta-hover/60 px-4 py-2.5 text-xs font-semibold text-texto-2`}>
                  <span>Producto</span><span className="text-right">Stock</span><span>Estado</span><span className="text-right">Acciones</span>
                </div>
                <ul className="flex flex-col gap-3 md:gap-0 md:divide-y md:divide-borde">
                  {visibles.map((p) => (
                    <li key={p.id} className={`${claseTarjeta} p-4 md:grid ${COLUMNAS} md:items-center md:rounded-none md:border-0 md:shadow-none md:py-3`}>
                      <div className="flex items-start justify-between gap-3 md:block min-w-0">
                        <div className="min-w-0">
                          <p className="text-texto font-semibold break-words">{p.nombre}</p>
                          <p className="text-texto-2 text-xs">{p.sku ?? 'Sin SKU'} · {p.categorias?.nombre}</p>
                        </div>
                        <span className="md:hidden"><Insignia info={INFO_NIVEL[nivelStock(p.stock, p.stock_minimo)]} /></span>
                      </div>
                      <p className="mt-3 text-texto-2 text-sm md:mt-0 md:text-right">
                        <span className="font-titulo text-xl font-bold text-texto tabular-nums">{p.stock}</span> {p.unidad}
                        <span className="block text-xs">mínimo {p.stock_minimo}</span>
                      </p>
                      <span className="hidden md:block"><Insignia info={INFO_NIVEL[nivelStock(p.stock, p.stock_minimo)]} /></span>
                      <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex md:justify-end">
                        <Link href={`/admin/inventario/${p.id}`} className={claseBoton('secundario', 'chico')}>Kardex</Link>
                        <button onClick={() => abrir(p)} className={claseBoton('primario', 'chico')}>Movimiento</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {producto && (
        <Modal titulo={`Movimiento: ${producto.nombre}`} bloqueado={guardando} onCerrar={cerrar}>
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <AvisoError mensaje={errorForm} />
            <p className="text-texto-2 text-sm">Stock actual: {producto.stock} {producto.unidad}</p>
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
              <button type="submit" disabled={guardando} className={claseBotonPrimario}>{guardando ? 'Guardando…' : 'Registrar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
