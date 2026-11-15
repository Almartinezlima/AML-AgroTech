'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LuCircleCheck, LuPackagePlus } from 'react-icons/lu'
import { Aviso, AvisoError, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import { claseBoton, claseEnlace, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { cantidadSugerida } from '@/lib/abastecimiento/ordenes'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { normalizar } from '@/lib/ecommerce/busqueda'
import type { ProductoReponer } from '@/types/abastecimiento'
import FilaReponer, { type Eleccion } from './FilaReponer'

type OrdenArmada = { id: string; codigo: string }

// Para reponer: productos en su mínimo o hasta 1,5× el mínimo, con el proveedor más barato y
// la cantidad sugerida. "Pedir otro producto" muestra el resto de lo que tiene proveedor.
export default function ListaReponer({ onArmadas }: { onArmadas: () => void }) {
  const { datos, cargando, error, recargar } = useDatosApi<ProductoReponer[]>('/api/abastecimiento/reponer')
  const [elecciones, setElecciones] = useState<Record<string, Eleccion>>({})
  const [verOtros, setVerOtros] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [armando, setArmando] = useState(false)
  const [errorArmar, setErrorArmar] = useState('')
  const [armadas, setArmadas] = useState<OrdenArmada[]>([])

  // Al cargar: los que hay que reponer, marcados, con el más barato y la cantidad sugerida
  useEffect(() => {
    if (!datos) return
    const inicial: Record<string, Eleccion> = {}
    for (const p of datos) {
      const barata = p.opciones[0]
      if (!barata) continue
      inicial[p.id] = {
        incluir: p.para_reponer,
        presentacion_id: barata.presentacion_id,
        cantidad: String(cantidadSugerida(p.stock, p.stock_minimo, barata.unidades_por_presentacion)),
      }
    }
    setElecciones(inicial)
  }, [datos])

  const cambiar = (producto: ProductoReponer, cambios: Partial<Eleccion>) =>
    setElecciones((actual) => {
      const nueva = { ...actual[producto.id], ...cambios }
      // Otra presentación trae otras unidades: se vuelve a sugerir la cantidad
      if (cambios.presentacion_id) {
        const opcion = producto.opciones.find((o) => o.presentacion_id === cambios.presentacion_id)
        if (opcion) nueva.cantidad = String(cantidadSugerida(producto.stock, producto.stock_minimo, opcion.unidades_por_presentacion))
      }
      return { ...actual, [producto.id]: nueva }
    })

  const paraReponer = useMemo(() => (datos ?? []).filter((p) => p.para_reponer), [datos])
  const otros = useMemo(() => {
    const texto = normalizar(busqueda)
    return (datos ?? []).filter((p) => !p.para_reponer && p.opciones.length > 0 && (!texto || normalizar(p.nombre).includes(texto)))
  }, [datos, busqueda])

  const lineas = Object.values(elecciones)
    .filter((e) => e.incluir && Number.isInteger(Number(e.cantidad)) && Number(e.cantidad) >= 1)
    .map((e) => ({ presentacion_id: e.presentacion_id, cantidad: Number(e.cantidad) }))

  const armar = async () => {
    setArmando(true)
    setErrorArmar('')
    try {
      const ordenes = await enviarJson<OrdenArmada[]>('/api/ordenes-compra', 'POST', { lineas })
      setArmadas(ordenes)
      // Lo que ya está en un borrador se desmarca para no pedirlo dos veces
      setElecciones((actual) => Object.fromEntries(Object.entries(actual).map(([id, e]) => [id, { ...e, incluir: false }])))
      onArmadas()
    } catch (causa) {
      setErrorArmar(mensajeDeError(causa))
    } finally {
      setArmando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-reponer" className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-reponer" className="font-titulo text-xl font-bold text-texto">Para reponer</h2>
          <p className="text-sm text-texto-2">En su mínimo o hasta 1,5 veces el mínimo. La cantidad sugerida llega al doble del mínimo.</p>
        </div>
      </div>

      {cargando ? (
        <BloqueCarga filas={3} alto="h-36" />
      ) : error || !datos ? (
        <BloqueError mensaje={error} onReintentar={() => void recargar()} />
      ) : (
        <div className="flex flex-col gap-4">
          {paraReponer.length === 0 ? (
            <div className={`${claseTarjeta} flex items-start gap-3 p-4`}>
              <LuCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
              <p className="text-sm text-texto-2">Todo el inventario está por encima de 1,5 veces su mínimo. Si igual quieres comprar, usa «Pedir otro producto».</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {paraReponer.map((p) => <FilaReponer key={p.id} producto={p} eleccion={elecciones[p.id]} onCambiar={(c) => cambiar(p, c)} />)}
            </ul>
          )}

          <button type="button" onClick={() => setVerOtros((v) => !v)} aria-expanded={verOtros} className={`${claseBoton('secundario', 'chico')} self-start`}>
            <LuPackagePlus className="h-4 w-4" aria-hidden="true" /> {verOtros ? 'Ocultar otros productos' : 'Pedir otro producto'}
          </button>

          {verOtros && (
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="buscar-otro" className="mb-1 block text-sm text-texto-2">Buscar producto con proveedor</label>
                <input id="buscar-otro" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className={claseInput} placeholder="Ej.: glifosato" />
              </div>
              {otros.length === 0 ? (
                <p className="text-sm text-texto-2">Ningún otro producto con proveedor coincide.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {otros.map((p) => <FilaReponer key={p.id} producto={p} eleccion={elecciones[p.id]} onCambiar={(c) => cambiar(p, c)} />)}
                </ul>
              )}
            </div>
          )}

          <AvisoError mensaje={errorArmar} />
          {armadas.length > 0 && (
            <Aviso tipo="ok">
              Listo: quedó en borrador{' '}
              {armadas.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && ', '}
                  <Link href={`/admin/abastecimiento/ordenes/${o.id}`} className={claseEnlace}>{o.codigo}</Link>
                </span>
              ))}
              . Revísala y envíasela al proveedor.
            </Aviso>
          )}

          <div className={`${claseTarjeta} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <p className={claseTituloSeccion}>
              {lineas.length === 0 ? 'Marca lo que quieres pedir' : `${lineas.length} producto${lineas.length === 1 ? '' : 's'} para pedir`}
            </p>
            <button type="button" onClick={() => void armar()} disabled={armando || lineas.length === 0} className={claseBoton('primario')}>
              {armando ? 'Armando…' : 'Armar orden'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
