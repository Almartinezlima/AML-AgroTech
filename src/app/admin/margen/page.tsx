'use client'
import { LuCircleHelp, LuPackageCheck, LuPercent, LuTrendingDown } from 'react-icons/lu'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { ResumenMargen } from '@/types/abastecimiento'
import TablaMargen, { textoPorcentaje } from './_components/TablaMargen'

// Margen de cada producto: precio de venta, costo (promedio de las compras o estimado con el
// proveedor más barato) y cuánto queda. Lo que deja menos, arriba.
export default function MargenPage() {
  const { datos, cargando, error, recargar } = useDatosApi<ResumenMargen>('/api/margen')
  const negativos = datos?.productos.filter((p) => (p.margen_bs ?? 0) < 0).length ?? 0

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-5xl">
        <EncabezadoAdmin
          titulo="Margen"
          descripcion="Cuánto gana la tienda en cada producto. El costo sale de las compras recibidas; mientras no haya ninguna, se estima con el proveedor más barato."
        />

        {cargando ? (
          <BloqueCarga filas={4} />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : datos.productos.length === 0 ? (
          <BloqueVacio icono={LuPercent} mensaje="No hay productos activos" />
        ) : (
          <>
            <TarjetasResumen
              etiqueta="Resumen del margen"
              cifras={[
                { titulo: 'Margen promedio', valor: datos.margen_promedio === null ? '—' : textoPorcentaje(datos.margen_promedio), detalle: 'entre los productos con costo', icono: LuPercent, tono: 'acento' },
                { titulo: 'Con costo real', valor: String(datos.con_costo), detalle: 'de compras recibidas', icono: LuPackageCheck },
                { titulo: 'Costo estimado', valor: String(datos.estimados), detalle: 'con el proveedor más barato', icono: LuCircleHelp, tono: datos.estimados > 0 ? 'pendiente' : 'neutro' },
                { titulo: 'Margen negativo', valor: String(negativos), detalle: datos.sin_costo > 0 ? `${datos.sin_costo} sin costo` : 'se vende bajo el costo', icono: LuTrendingDown, tono: negativos > 0 ? 'error' : 'neutro' },
              ]}
            />
            <TablaMargen productos={datos.productos} />
          </>
        )}
      </div>
    </div>
  )
}
