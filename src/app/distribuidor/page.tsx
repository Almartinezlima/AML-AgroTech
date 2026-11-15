'use client'
import { useCallback, useMemo, useState } from 'react'
import { LuBuilding2, LuCircleCheck, LuClock, LuPackageOpen, LuPlus, LuTag } from 'react-icons/lu'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseFilaFiltros, claseFiltro, clasePagina, claseTituloAdmin } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Distribuidor, Presentacion } from '@/types/abastecimiento'
import ListaPresentaciones from './_components/ListaPresentaciones'
import ModalPresentacion, { type ProductoTienda } from './_components/ModalPresentacion'

type Filtro = 'activas' | 'inactivas'

// Panel del proveedor mayorista: su ficha y las presentaciones que le vende a la tienda.
export default function DistribuidorPage() {
  const ficha = useDatosApi<Distribuidor | null>('/api/distribuidor/ficha')
  const habilitada = Boolean(ficha.datos?.activo)
  const lista = useDatosApi<Presentacion[]>(habilitada ? '/api/distribuidor/presentaciones' : null)
  const productos = useDatosApi<ProductoTienda[]>(habilitada ? '/api/productos' : null)
  const [filtro, setFiltro] = useState<Filtro>('activas')
  const [editando, setEditando] = useState<Presentacion | 'nueva' | null>(null)

  const recargar = lista.recargar
  const cerrar = useCallback(() => setEditando(null), [])
  const guardado = useCallback(() => { setEditando(null); void recargar() }, [recargar])

  const todas = useMemo(() => lista.datos ?? [], [lista.datos])
  const activas = todas.filter((p) => p.activo)
  const visibles = filtro === 'activas' ? activas : todas.filter((p) => !p.activo)

  if (ficha.cargando) return <div className={clasePagina}><div className="mx-auto max-w-4xl"><BloqueCarga /></div></div>
  if (ficha.error) return <div className={clasePagina}><div className="mx-auto max-w-4xl"><BloqueError mensaje={ficha.error} onReintentar={() => void ficha.recargar()} /></div></div>

  if (!ficha.datos || !habilitada) {
    return (
      <div className={clasePagina}>
        <div className="mx-auto max-w-4xl">
          <BloqueVacio icono={LuBuilding2} mensaje="Tu cuenta de proveedor todavía no está habilitada">
            <p className="text-sm text-texto-2">La tienda tiene que completar tu ficha (nombre comercial, ciudad y días de entrega). Escríbele para que lo haga.</p>
          </BloqueVacio>
        </div>
      </div>
    )
  }

  const f = ficha.datos
  const productosCubiertos = new Set(activas.map((p) => p.producto_id)).size

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-trigo">Panel del proveedor</p>
            <h1 className={`${claseTituloAdmin} break-words`}>{f.nombre_comercial}</h1>
            <p className="mt-1 text-texto-2">{f.ciudad} · entrega habitual en {f.dias_entrega} día{f.dias_entrega === 1 ? '' : 's'}</p>
          </div>
          <button onClick={() => setEditando('nueva')} disabled={!productos.datos} className={claseBotonPrimario}>
            <LuPlus className="h-5 w-5" aria-hidden="true" /> Nueva presentación
          </button>
        </header>

        <TarjetasResumen
          etiqueta="Resumen de tus presentaciones"
          cifras={[
            { titulo: 'Presentaciones', valor: String(activas.length), detalle: 'las que vendes hoy', icono: LuPackageOpen, tono: 'acento' },
            { titulo: 'Disponibles', valor: String(activas.filter((p) => p.disponible).length), detalle: 'con stock para la tienda', icono: LuCircleCheck, tono: 'acento' },
            { titulo: 'Productos', valor: String(productosCubiertos), detalle: 'de la tienda que cubres', icono: LuTag },
            { titulo: 'Entrega', valor: `${f.dias_entrega} día${f.dias_entrega === 1 ? '' : 's'}`, detalle: 'si no indicas otro plazo', icono: LuClock },
          ]}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-titulo text-xl font-bold text-texto">Mis presentaciones</h2>
          <div className={claseFilaFiltros} role="group" aria-label="Filtrar presentaciones">
            <button type="button" onClick={() => setFiltro('activas')} aria-pressed={filtro === 'activas'} className={claseFiltro(filtro === 'activas')}>Las que vendo</button>
            <button type="button" onClick={() => setFiltro('inactivas')} aria-pressed={filtro === 'inactivas'} className={claseFiltro(filtro === 'inactivas')}>Ya no vendo</button>
          </div>
        </div>

        {lista.cargando ? (
          <BloqueCarga />
        ) : lista.error || !lista.datos ? (
          <BloqueError mensaje={lista.error} onReintentar={() => void recargar()} />
        ) : visibles.length === 0 ? (
          <BloqueVacio icono={LuPackageOpen} mensaje={filtro === 'activas' ? 'Todavía no cargaste presentaciones' : 'No hay presentaciones que dejaste de vender'}>
            {filtro === 'activas' && <p className="text-sm text-texto-2">Toca «Nueva presentación»: elige el producto de la tienda, cuánto trae y tu precio mayorista.</p>}
          </BloqueVacio>
        ) : (
          <ListaPresentaciones presentaciones={visibles} diasFicha={f.dias_entrega} onEditar={setEditando} onActualizado={() => void recargar()} />
        )}
      </div>

      {editando && productos.datos && (
        <ModalPresentacion
          presentacion={editando === 'nueva' ? null : editando}
          productos={productos.datos}
          diasFicha={f.dias_entrega}
          onCerrar={cerrar}
          onGuardado={guardado}
        />
      )}
    </div>
  )
}
