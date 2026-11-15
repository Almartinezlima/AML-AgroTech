'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { LuBuilding2, LuPackageOpen, LuPlus, LuTag, LuUserPlus } from 'react-icons/lu'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import PestanasAbastecimiento from '@/components/admin/PestanasAbastecimiento'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import { Aviso, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseEnlace, clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { DistribuidorAdmin, ResumenDistribuidoresAdmin } from '@/types/abastecimiento'
import ModalFicha from './_components/ModalFicha'
import TarjetaDistribuidor from './_components/TarjetaDistribuidor'

// Proveedores mayoristas: sus fichas y lo que le venden a la tienda
export default function AdminDistribuidoresPage() {
  const { datos, cargando, error, recargar } = useDatosApi<ResumenDistribuidoresAdmin>('/api/distribuidores')
  const [editando, setEditando] = useState<DistribuidorAdmin | 'nueva' | null>(null)

  const cerrar = useCallback(() => setEditando(null), [])
  const guardado = useCallback(() => { setEditando(null); void recargar() }, [recargar])

  const sinFicha = datos?.cuentas_sin_ficha ?? []
  const activos = datos?.distribuidores.filter((d) => d.activo) ?? []
  const presentaciones = activos.flatMap((d) => d.presentaciones.filter((p) => p.activo))
  const productosConProveedor = new Set(presentaciones.filter((p) => p.disponible).map((p) => p.producto_id)).size

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-5xl">
        <EncabezadoAdmin
          titulo="Distribuidores"
          descripcion="Proveedores mayoristas de Sucre y Santa Cruz, y lo que le venden a la tienda."
          acciones={
            <button onClick={() => setEditando('nueva')} disabled={sinFicha.length === 0} className={claseBotonPrimario}>
              <LuPlus className="h-5 w-5" aria-hidden="true" /> Nueva ficha
            </button>
          }
        />
        <PestanasAbastecimiento />

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <>
            <TarjetasResumen
              etiqueta="Resumen de distribuidores"
              cifras={[
                { titulo: 'Distribuidores', valor: String(activos.length), detalle: 'activos', icono: LuBuilding2, tono: 'acento' },
                { titulo: 'Presentaciones', valor: String(presentaciones.length), detalle: 'a la venta', icono: LuPackageOpen },
                { titulo: 'Productos', valor: String(productosConProveedor), detalle: 'con proveedor disponible', icono: LuTag },
                { titulo: 'Sin ficha', valor: String(sinFicha.length), detalle: 'cuentas por completar', icono: LuUserPlus, tono: sinFicha.length > 0 ? 'pendiente' : 'neutro' },
              ]}
            />

            {sinFicha.length > 0 && (
              <div className="mb-4">
                <Aviso tipo="advertencia">
                  {sinFicha.length === 1 ? 'Hay 1 cuenta' : `Hay ${sinFicha.length} cuentas`} con rol Distribuidor sin ficha. Toca «Nueva ficha» para que pueda cargar sus presentaciones.
                </Aviso>
              </div>
            )}

            {datos.distribuidores.length === 0 ? (
              <BloqueVacio icono={LuBuilding2} mensaje="Todavía no hay distribuidores">
                <p className="text-sm text-texto-2">
                  1) El proveedor crea su cuenta. 2) En <Link href="/admin/usuarios" className={claseEnlace}>Usuarios</Link> le cambias el rol a Distribuidor. 3) Acá completas su ficha.
                </p>
              </BloqueVacio>
            ) : (
              <ul className="flex flex-col gap-4">
                {datos.distribuidores.map((d) => <TarjetaDistribuidor key={d.id} distribuidor={d} onEditar={() => setEditando(d)} />)}
              </ul>
            )}

            {datos.distribuidores.length > 0 && (
              <p className="mt-6 text-sm text-texto-2">
                Para sumar un proveedor: el proveedor crea su cuenta, en <Link href="/admin/usuarios" className={claseEnlace}>Usuarios</Link> le cambias el rol a Distribuidor y acá completas su ficha.
              </p>
            )}
          </>
        )}
      </div>

      {editando && datos && (
        <ModalFicha ficha={editando === 'nueva' ? null : editando} cuentas={sinFicha} onCerrar={cerrar} onGuardado={guardado} />
      )}
    </div>
  )
}
