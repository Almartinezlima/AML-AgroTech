'use client'
import Link from 'next/link'
import Estrellas from '@/components/entrega/Estrellas'
import { BloqueCarga } from '@/components/ui/Estados'
import { claseEnlace, claseTarjeta, claseTextoError, claseTituloSeccion } from '@/components/ui/estilos'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { diaHora } from '@/lib/ecommerce/presentacion'
import type { ResumenCalificaciones } from '@/types/entrega'

// Calificaciones de la entrega (fase 9D): promedio, cuántas son bajas y las últimas con comentario
export default function TarjetaCalificaciones() {
  const { datos, cargando, error } = useDatosApi<ResumenCalificaciones>('/api/calificaciones')

  return (
    <section className={`${claseTarjeta} p-5`}>
      <h2 className={`${claseTituloSeccion} mb-4`}>Calificaciones de entrega</h2>
      {cargando && !datos ? (
        <BloqueCarga filas={2} alto="h-10" />
      ) : error || !datos ? (
        <p className={`${claseTextoError} text-sm`}>No se pudieron cargar las calificaciones.</p>
      ) : datos.total === 0 ? (
        <p className="text-sm text-texto-2">Todavía no hay calificaciones. Los clientes califican al recibir su pedido.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-titulo text-4xl font-bold tabular-nums text-texto">{datos.promedio?.toLocaleString('es-BO', { minimumFractionDigits: 1 })}</p>
            <div className="pb-1">
              <Estrellas valor={Math.round(datos.promedio ?? 0)} tamano="chico" />
              <p className="text-sm text-texto-2">
                {datos.total} {datos.total === 1 ? 'calificación' : 'calificaciones'}
                {datos.bajas > 0 && <span className={`${claseTextoError} font-semibold`}> · {datos.bajas} {datos.bajas === 1 ? 'baja' : 'bajas'}</span>}
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {datos.ultimas.slice(0, 5).map((c) => (
              <li key={c.id} className={`text-sm ${c.estrellas <= 2 ? 'rounded-xl bg-estado-error/5 p-2 -mx-2' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/pedidos/${c.pedido_id}`} className={claseEnlace}>{c.codigo ?? 'Pedido'}</Link>
                  <Estrellas valor={c.estrellas} tamano="chico" />
                </div>
                {c.comentario && <p className="mt-0.5 text-texto break-words">«{c.comentario}»</p>}
                <p className="text-xs text-texto-2">{c.cliente ?? 'Cliente'} · {diaHora(c.created_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
