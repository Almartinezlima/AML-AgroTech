'use client'
import Link from 'next/link'
import { LuArrowLeft, LuClipboardList } from 'react-icons/lu'
import DatosOrden from '@/components/abastecimiento/DatosOrden'
import LineaTiempoOrden from '@/components/abastecimiento/LineaTiempoOrden'
import LineasOrden from '@/components/abastecimiento/LineasOrden'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, clasePagina, claseTarjeta, claseTituloAdmin, claseTituloSeccion } from '@/components/ui/estilos'
import { INFO_ESTADO_ORDEN, QUE_SIGUE_PROVEEDOR } from '@/lib/abastecimiento/ordenes'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { OrdenCompraDetalle } from '@/types/abastecimiento'
import AccionesProveedor from './_components/AccionesProveedor'

// Una orden de compra del lado del proveedor: qué le piden, a qué precio y qué tiene que hacer.
// Nunca ve stock, costos ni clientes de la tienda.
export default function OrdenProveedorPage({ params }: { params: { id: string } }) {
  const { datos: orden, cargando, error, estadoError, recargar } = useDatosApi<OrdenCompraDetalle>(`/api/ordenes-compra/${params.id}`)

  const volver = (
    <Link href="/distribuidor" className={`${claseBoton('secundario', 'chico')} mb-4`}>
      <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a mi panel
    </Link>
  )
  const marco = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="mx-auto max-w-4xl">{volver}{contenido}</div></div>
  )

  if (cargando && !orden) return marco(<BloqueCarga filas={3} alto="h-32" />)
  if (estadoError === 404 || estadoError === 400) return marco(<BloqueVacio icono={LuClipboardList} mensaje="Esa orden no existe" />)
  if (error || !orden) return marco(<BloqueError mensaje={error} onReintentar={() => void recargar()} />)

  return marco(
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-trigo">Orden de compra de AML AgroTech</p>
          <h1 className={`${claseTituloAdmin} break-words`}>{orden.codigo}</h1>
          <p className="mt-1 max-w-prose text-sm text-texto">{QUE_SIGUE_PROVEEDOR[orden.estado]}</p>
        </div>
        <Insignia info={INFO_ESTADO_ORDEN[orden.estado]} />
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <LineasOrden lineas={orden.lineas} total={orden.total} totalRecibido={orden.total_recibido} conRecepcion={orden.estado === 'recibida'} />
          <DatosOrden orden={orden} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AccionesProveedor orden={orden} onCambio={() => void recargar()} />
          <section className={`${claseTarjeta} p-4 sm:p-5`}>
            <h2 className={`${claseTituloSeccion} mb-4`}>Línea de tiempo</h2>
            <LineaTiempoOrden eventos={orden.seguimiento} />
          </section>
        </div>
      </div>
    </>
  )
}
