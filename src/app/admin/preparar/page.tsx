'use client'
import { useState } from 'react'
import type { IconType } from 'react-icons'
import { LuClipboardList, LuPackageCheck, LuPackageOpen } from 'react-icons/lu'
import { Cifra } from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import PasosAyuda from '@/components/ui/PasosAyuda'
import { clasePagina, claseTituloAdmin } from '@/components/ui/estilos'
import { CADA_10_S, useDatosApi } from '@/lib/api/useDatosApi'
import type { PedidoCola } from '@/types/almacen'
import type { EstadoPedido } from '@/types/comercio'
import TarjetaCola from './_components/TarjetaCola'

type Grupo = 'por_preparar' | 'preparando' | 'listos'

const GRUPOS: Array<{ id: Grupo; titulo: string; vacio: string; estados: EstadoPedido[]; icono: IconType }> = [
  { id: 'por_preparar', titulo: 'Por preparar', vacio: 'No hay pedidos por preparar', estados: ['confirmado'], icono: LuClipboardList },
  { id: 'preparando', titulo: 'En preparación', vacio: 'No hay pedidos en preparación', estados: ['preparando'], icono: LuPackageOpen },
  { id: 'listos', titulo: 'Listos', vacio: 'No hay pedidos listos esperando', estados: ['empacado', 'listo_para_recoger'], icono: LuPackageCheck },
]

// "Por preparar" (fase 9C; desde la 9F lo hace el admin): la cola de pedidos con el pago
// verificado, el más nuevo arriba (9G) y actualizada cada 10 s. "Listo para salir" avisa al grupo de repartidores.
export default function AlmacenPage() {
  const { datos, cargando, error, recargar } = useDatosApi<PedidoCola[]>('/api/almacen/pedidos', { cadaMs: CADA_10_S })
  const [activo, setActivo] = useState<Grupo>('por_preparar')

  // Fase 9G: el más nuevo arriba (la base los da del más antiguo al más nuevo)
  const delGrupo = (grupo: (typeof GRUPOS)[number]) => (datos ?? [])
    .filter((p) => grupo.estados.includes(p.estado))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const grupo = GRUPOS.find((g) => g.id === activo) ?? GRUPOS[0]
  const lista = delGrupo(grupo)

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-trigo">Preparación</p>
          <h1 className={claseTituloAdmin}>Preparación y empaque</h1>
          <p className="mt-1 text-texto-2">Lo más nuevo va arriba y la lista se actualiza sola. Cada paso queda registrado con tu nombre.</p>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {GRUPOS.map((g) => (
            <Cifra
              key={g.id}
              titulo={g.titulo}
              valor={datos ? String(delGrupo(g).length) : '—'}
              detalle={g.id === activo ? 'Mostrando' : 'Ver lista'}
              icono={g.icono}
              tono={g.id === 'por_preparar' ? 'pendiente' : 'acento'}
              activa={g.id === activo}
              onClick={() => setActivo(g.id)}
            />
          ))}
        </div>

        {cargando && !datos ? <BloqueCarga filas={3} alto="h-32" />
          : error ? <BloqueError mensaje={error} onReintentar={() => void recargar()} />
          : lista.length === 0 ? <BloqueVacio icono={grupo.icono} mensaje={grupo.vacio} />
          : (
            <ul className="flex flex-col gap-3">
              {lista.map((p) => <li key={p.id}><TarjetaCola pedido={p} /></li>)}
            </ul>
          )}

        <div className="mt-8">
          <PasosAyuda pasos={[
            'En «Por preparar», toca «Empezar a preparar» en el pedido: empieza y se abre para marcar los productos.',
            'Marca cada producto cuando lo pongas en la caja. Si falta algo, toca «Reportar faltante»: el cliente ve «Revisando un producto de tu pedido» hasta que lo resuelvas.',
            'Con todo marcado, toca «Listo para salir», indica cuántos bultos son e imprime una etiqueta por bulto. Si es a domicilio, se avisa al grupo de repartidores.',
          ]} />
        </div>
      </div>
    </div>
  )
}
