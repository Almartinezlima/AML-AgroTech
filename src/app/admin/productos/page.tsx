'use client'
import { useCallback, useState } from 'react'
import ImagenProducto from '@/components/ImagenProducto'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBotonPrimario, claseBotonSecundario, claseInput, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { Categoria, Producto } from '@/types/comercio'
import ModalProducto from './_components/ModalProducto'
import { LuPackage } from 'react-icons/lu'

export default function AdminProductosPage() {
  const { datos, cargando, error, recargar } = useDatosApi<Producto[]>('/api/productos?alcance=todos')
  const categorias = useDatosApi<Categoria[]>('/api/categorias')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Producto | 'nuevo' | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<Producto | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorEstado, setErrorEstado] = useState('')

  const cerrarEdicion = useCallback(() => setEditando(null), [])
  const cerrarEstado = useCallback(() => setCambiandoEstado(null), [])

  const termino = busqueda.trim().toLowerCase()
  const visibles = (datos ?? []).filter((p) => `${p.nombre} ${p.sku ?? ''}`.toLowerCase().includes(termino))

  const confirmarEstado = async () => {
    if (!cambiandoEstado) return
    setProcesando(true)
    setErrorEstado('')
    try {
      await enviarJson(`/api/productos/${cambiandoEstado.id}`, 'PATCH', { activo: !cambiandoEstado.activo })
      setCambiandoEstado(null)
      await recargar()
    } catch (causa) {
      setErrorEstado(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold text-texto">Productos</h1>
            <p className="text-texto-2 mt-1">{datos?.length ?? 0} registrados</p>
          </div>
          <button onClick={() => setEditando('nuevo')} className={claseBotonPrimario}>+ Nuevo producto</button>
        </div>

        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar producto" className={`${claseInput} mb-6`} />

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : visibles.length === 0 ? (
          <BloqueVacio icono={LuPackage} mensaje="No se encontraron productos" />
        ) : (
          <ul className="flex flex-col gap-3">
            {visibles.map((p) => (
              <li key={p.id} className={`${claseTarjeta} p-3 sm:p-4 flex gap-3 sm:gap-4`}>
                <ImagenProducto nombre={p.nombre} imagen={p.imagen_url} icono={p.icono} categoria={p.categorias?.nombre}
                  className="w-14 h-14 rounded-lg shrink-0" sizes="56px" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-texto font-semibold text-sm min-w-0 break-words">{p.nombre}</p>
                    <Insignia info={p.activo ? { etiqueta: 'Activo', color: '#22c55e' } : { etiqueta: 'Inactivo', color: '#ef4444' }} />
                  </div>
                  <p className="text-texto-2 text-xs">{p.sku ?? 'Sin SKU'} · {p.categorias?.nombre} · Stock: {p.stock} · {p.unidad}</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
                    <span className="text-acento font-bold">{formatoBs(p.precio)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setErrorEstado(''); setCambiandoEstado(p) }} className={`${claseBotonSecundario} !px-3 !py-2 text-sm`}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                      <button onClick={() => setEditando(p)} className={`${claseBotonSecundario} !px-3 !py-2 text-sm`}>Editar</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <ModalProducto
          producto={editando === 'nuevo' ? null : editando}
          categorias={categorias.datos ?? []}
          onCerrar={cerrarEdicion}
          onGuardado={() => { setEditando(null); void recargar() }}
        />
      )}

      {cambiandoEstado && (
        <ModalConfirmacion
          titulo={cambiandoEstado.activo ? 'Desactivar producto' : 'Activar producto'}
          mensaje={cambiandoEstado.activo ? `${cambiandoEstado.nombre} dejará de verse en el catálogo.` : `${cambiandoEstado.nombre} volverá a verse en el catálogo.`}
          textoConfirmar={cambiandoEstado.activo ? 'Desactivar' : 'Activar'}
          peligro={cambiandoEstado.activo}
          procesando={procesando}
          error={errorEstado}
          onConfirmar={() => void confirmarEstado()}
          onCancelar={cerrarEstado}
        />
      )}
    </div>
  )
}
