'use client'
import { useState } from 'react'
import type { IconType } from 'react-icons'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import TarjetasResumen, { type TonoCifra } from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { EstadoPedido, PedidoResumen } from '@/types/comercio'
import ListaPedidosAdmin from '../_components/ListaPedidosAdmin'
import { LuPackageCheck, LuPackageOpen, LuStore, LuTruck } from 'react-icons/lu'

const GRUPOS: Array<{ estado: EstadoPedido; titulo: string; vacio: string; icono: IconType; tono: TonoCifra }> = [
  { estado: 'confirmado', titulo: 'Por preparar', vacio: 'No hay pedidos por preparar', icono: LuPackageOpen, tono: 'pendiente' },
  { estado: 'preparando', titulo: 'En preparación', vacio: 'No hay pedidos en preparación', icono: LuPackageCheck, tono: 'acento' },
  { estado: 'listo_para_recoger', titulo: 'Para recoger en tienda', vacio: 'No hay pedidos esperando en tienda', icono: LuStore, tono: 'acento' },
  { estado: 'despachado', titulo: 'En camino', vacio: 'No hay pedidos en camino', icono: LuTruck, tono: 'camino' },
]

export default function AdminEnviosPage() {
  const { datos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>('/api/pedidos?alcance=todos')
  const [activo, setActivo] = useState<EstadoPedido>('confirmado')
  const grupo = GRUPOS.find((g) => g.estado === activo) ?? GRUPOS[0]
  const delGrupo = (estado: EstadoPedido) => (datos ?? []).filter((p) => p.estado === estado)

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <EncabezadoAdmin
          titulo="Envíos"
          descripcion="Pedidos pagados en camino al cliente. Elige un grupo y pásalo al siguiente paso."
        />

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <>
            {/* Cada cifra es también el filtro de la lista */}
            <TarjetasResumen
              etiqueta="Grupos de envío"
              cifras={GRUPOS.map((g) => {
                const cantidad = delGrupo(g.estado).length
                return {
                  titulo: g.titulo,
                  valor: String(cantidad),
                  detalle: g.estado === activo ? 'Mostrando' : 'Ver lista',
                  icono: g.icono,
                  tono: cantidad > 0 ? g.tono : 'neutro',
                  activa: g.estado === activo,
                  onClick: () => setActivo(g.estado),
                }
              })}
            />

            <h2 className="mb-3 font-titulo text-lg font-bold text-texto">{grupo.titulo}</h2>
            {delGrupo(activo).length === 0 ? (
              <BloqueVacio icono={LuTruck} mensaje={grupo.vacio} />
            ) : (
              <ListaPedidosAdmin pedidos={delGrupo(activo)} onActualizado={() => void recargar()} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
