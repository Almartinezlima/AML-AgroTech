'use client'
import { useState } from 'react'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { clasePagina } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { EstadoPedido, PedidoResumen } from '@/types/comercio'
import ListaPedidosAdmin from '../_components/ListaPedidosAdmin'
import { LuTruck } from 'react-icons/lu'

const GRUPOS: Array<{ estado: EstadoPedido; titulo: string; vacio: string }> = [
  { estado: 'confirmado', titulo: 'Por preparar', vacio: 'No hay pedidos por preparar' },
  { estado: 'preparando', titulo: 'Por despachar', vacio: 'No hay pedidos por despachar' },
  { estado: 'despachado', titulo: 'En camino', vacio: 'No hay pedidos en camino' },
]

export default function AdminEnviosPage() {
  const { datos, cargando, error, recargar } = useDatosApi<PedidoResumen[]>('/api/pedidos?alcance=todos')
  const [activo, setActivo] = useState<EstadoPedido>('confirmado')
  const grupo = GRUPOS.find((g) => g.estado === activo) ?? GRUPOS[0]
  const delGrupo = (estado: EstadoPedido) => (datos ?? []).filter((p) => p.estado === estado)

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#f0fdf4] mb-6">Envíos</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {GRUPOS.map((g) => (
            <button
              key={g.estado}
              onClick={() => setActivo(g.estado)}
              aria-pressed={g.estado === activo}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                g.estado === activo ? 'bg-[#22c55e] text-[#0a0f0a]' : 'bg-[#111811] border border-[#1a2e1a] text-[#86efac] hover:border-[#22c55e]'
              }`}
            >
              {g.titulo} ({delGrupo(g.estado).length})
            </button>
          ))}
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : delGrupo(activo).length === 0 ? (
          <BloqueVacio icono={LuTruck} mensaje={grupo.vacio} />
        ) : (
          <ListaPedidosAdmin pedidos={delGrupo(activo)} onActualizado={() => void recargar()} />
        )}
      </div>
    </div>
  )
}
