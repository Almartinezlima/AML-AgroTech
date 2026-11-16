'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseEnlace, claseInput, clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_ESTADO_PEDIDO } from '@/lib/ecommerce/presentacion'
import { ESTADOS_PEDIDO, type EstadoPedido, type PedidoResumen } from '@/types/comercio'
import ListaPedidosAdmin from '../_components/ListaPedidosAdmin'
import { LuShoppingCart } from 'react-icons/lu'

// ?codigo=AML-0123 (enlace del aviso de Telegram) muestra solo ese pedido
function ContenidoPedidos() {
  const codigo = useSearchParams().get('codigo')?.trim().toUpperCase() || null
  const [estado, setEstado] = useState<EstadoPedido | ''>('')
  const url = `/api/pedidos?alcance=todos${estado ? `&estado=${estado}` : ''}`
  const { datos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>(url)
  const pedidos = codigo ? datos?.filter((p) => p.codigo.toUpperCase() === codigo) : datos

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <EncabezadoAdmin
          titulo="Pedidos"
          descripcion="Todos los pedidos de la tienda, del más nuevo al más viejo."
          acciones={
            <>
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

        {codigo && (
          <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-2">
            Mostrando solo el pedido <span className="font-semibold text-texto">{codigo}</span>
            <Link href="/admin/pedidos" className={claseEnlace}>Ver todos los pedidos</Link>
          </p>
        )}

        {cargando ? (
          <BloqueCarga />
        ) : error || !pedidos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : pedidos.length === 0 ? (
          <BloqueVacio icono={LuShoppingCart} mensaje={codigo ? `No se encontró el pedido ${codigo} con este filtro` : 'No hay pedidos con ese estado'} />
        ) : (
          <ListaPedidosAdmin pedidos={pedidos} onActualizado={() => void recargar()} />
        )}
      </div>
    </div>
  )
}

export default function AdminPedidosPage() {
  return (
    <Suspense fallback={<div className={clasePagina}><BloqueCarga /></div>}>
      <ContenidoPedidos />
    </Suspense>
  )
}
