'use client'
import { useState } from 'react'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import InterruptorPruebas, { conPruebas, useMostrarPruebas } from '@/components/admin/InterruptorPruebas'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseInput, clasePagina } from '@/components/ui/estilos'
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
        <EncabezadoAdmin
          titulo="Pedidos"
          descripcion="Todos los pedidos de la tienda, del más nuevo al más viejo."
          acciones={
            <>
              <InterruptorPruebas mostrar={mostrar} onCambiar={setMostrar} />
              <select
                value={estado}
                aria-label="Filtrar por estado"
                onChange={(e) => setEstado(e.target.value as EstadoPedido | '')}
                className={`${claseInput} !w-auto !bg-tarjeta`}
              >
                <option value="">Todos los estados</option>
                {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{INFO_ESTADO_PEDIDO[e].etiqueta}</option>)}
              </select>
            </>
          }
        />

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
