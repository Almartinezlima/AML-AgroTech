'use client'
import { useState } from 'react'
import InterruptorPruebas, { conPruebas, useMostrarPruebas } from '@/components/admin/InterruptorPruebas'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_ESTADO_PEDIDO } from '@/lib/ecommerce/presentacion'
import { ESTADOS_PEDIDO, type EstadoPedido, type PedidoResumen } from '@/types/comercio'
import ListaPedidosAdmin from '../_components/ListaPedidosAdmin'
import { LuShoppingCart } from 'react-icons/lu'

export default function AdminPedidosPage() {
  const [estado, setEstado] = useState<EstadoPedido | ''>('')
  const { mostrar, setMostrar, listo } = useMostrarPruebas()
  const url = conPruebas(`/api/pedidos?alcance=todos${estado ? `&estado=${estado}` : ''}`, mostrar)
  const { datos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>(listo ? url : null)

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h1 className="text-3xl font-bold text-texto">Pedidos</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <InterruptorPruebas mostrar={mostrar} onCambiar={setMostrar} />
            <select
              value={estado}
              aria-label="Filtrar por estado"
              onChange={(e) => setEstado(e.target.value as EstadoPedido | '')}
              className="bg-tarjeta border border-borde text-texto rounded-xl px-4 py-3 outline-none focus:border-acento"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{INFO_ESTADO_PEDIDO[e].etiqueta}</option>)}
            </select>
          </div>
        </div>

        {cargando || !listo ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : datos.length === 0 ? (
          <BloqueVacio icono={LuShoppingCart} mensaje="No hay pedidos con ese estado" />
        ) : (
          <ListaPedidosAdmin pedidos={datos} onActualizado={() => void recargar()} />
        )}
      </div>
    </div>
  )
}
