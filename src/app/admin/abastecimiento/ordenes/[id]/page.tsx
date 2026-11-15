'use client'
import Link from 'next/link'
import { LuArrowLeft, LuClipboardList } from 'react-icons/lu'
import DatosOrden from '@/components/abastecimiento/DatosOrden'
import LineaTiempoOrden from '@/components/abastecimiento/LineaTiempoOrden'
import LineasOrden from '@/components/abastecimiento/LineasOrden'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, clasePagina, claseTarjeta, claseTituloAdmin, claseTituloSeccion } from '@/components/ui/estilos'
import { INFO_ESTADO_ORDEN, QUE_SIGUE_ADMIN } from '@/lib/abastecimiento/ordenes'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { OrdenCompraAdmin } from '@/types/abastecimiento'
import AccionesOrdenAdmin from './_components/AccionesOrdenAdmin'
import EditorBorrador from './_components/EditorBorrador'

const INSIGNIA_PRUEBA = { etiqueta: 'Proveedor de prueba', color: '#3b82f6' }

// Una orden de compra del lado del admin: líneas, acciones según el estado y línea de tiempo
export default function OrdenCompraAdminPage({ params }: { params: { id: string } }) {
  const { datos: orden, cargando, error, estadoError, recargar } = useDatosApi<OrdenCompraAdmin>(`/api/ordenes-compra/${params.id}`)

  const volver = (
    <Link href="/admin/abastecimiento" className={`${claseBoton('secundario', 'chico')} mb-4`}>
      <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a abastecimiento
    </Link>
  )

  if (cargando && !orden) return <div className={clasePagina}><div className="mx-auto max-w-5xl">{volver}<BloqueCarga filas={3} alto="h-32" /></div></div>

  if (estadoError === 404 || estadoError === 400) {
    return (
      <div className={clasePagina}>
        <div className="mx-auto max-w-5xl">
          {volver}
          <BloqueVacio icono={LuClipboardList} mensaje="Esa orden de compra no existe" />
        </div>
      </div>
    )
  }

  if (error || !orden) {
    return <div className={clasePagina}><div className="mx-auto max-w-5xl">{volver}<BloqueError mensaje={error} onReintentar={() => void recargar()} /></div></div>
  }

  const recargarOrden = () => void recargar()

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-5xl">
        {volver}

        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-trigo">Orden de compra</p>
            <h1 className={`${claseTituloAdmin} break-words`}>{orden.codigo}</h1>
            <p className="mt-1 text-texto-2 break-words">{orden.distribuidor?.nombre_comercial} · {orden.distribuidor?.ciudad}</p>
            <p className="mt-1 max-w-prose text-sm text-texto">{QUE_SIGUE_ADMIN[orden.estado]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {orden.es_prueba && <Insignia info={INSIGNIA_PRUEBA} />}
            <Insignia info={INFO_ESTADO_ORDEN[orden.estado]} />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-4">
            {orden.estado === 'borrador' ? (
              <EditorBorrador orden={orden} onCambio={recargarOrden} />
            ) : (
              <LineasOrden lineas={orden.lineas} total={orden.total} totalRecibido={orden.total_recibido} conRecepcion={orden.estado === 'recibida'} />
            )}
            <DatosOrden orden={orden} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <AccionesOrdenAdmin orden={orden} onCambio={recargarOrden} />
            <section className={`${claseTarjeta} p-4 sm:p-5`}>
              <h2 className={`${claseTituloSeccion} mb-4`}>Línea de tiempo</h2>
              <LineaTiempoOrden eventos={orden.seguimiento} />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
