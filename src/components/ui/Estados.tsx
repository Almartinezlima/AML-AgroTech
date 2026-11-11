import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { LuCircleCheck, LuInbox, LuRotateCw, LuTriangleAlert } from 'react-icons/lu'
import { claseBotonPrimario, claseTarjeta } from './estilos'

// Skeleton con la forma del contenido y brillo suave
export function BloqueCarga({ filas = 4, alto = 'h-20' }: { filas?: number; alto?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={`esqueleto rounded-2xl border border-borde ${alto}`} />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export function BloqueVacio({ icono: Icono = LuInbox, mensaje, children }: { icono?: IconType; mensaje: string; children?: ReactNode }) {
  return (
    <div className={`${claseTarjeta} text-center py-16 px-4`}>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-tarjeta-hover text-texto-2">
        <Icono className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="text-texto-2 mt-4 text-lg">{mensaje}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

export function BloqueError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="bg-tarjeta border border-red-300 rounded-2xl p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700">
        <LuTriangleAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="text-texto font-semibold mt-4 mb-1">No se pudo cargar</p>
      <p className="text-texto-2 text-sm mb-5">{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar} className={`${claseBotonPrimario} inline-flex items-center gap-2`}>
          <LuRotateCw className="h-4 w-4" aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  )
}

export function AvisoError({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null
  return <Aviso tipo="error">{mensaje}</Aviso>
}

// Aviso en línea con ícono (errores de formularios, confirmaciones, advertencias)
export function Aviso({ tipo, children }: { tipo: 'error' | 'ok' | 'advertencia'; children: ReactNode }) {
  const estilos = {
    error: 'bg-red-50 border-red-300 text-red-800',
    ok: 'bg-tarjeta-hover border-acento text-texto-2',
    advertencia: 'bg-amber-50 border-[#f59e0b] text-amber-900',
  }[tipo]
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${estilos}`}>
      <IconoAviso tipo={tipo} />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

function IconoAviso({ tipo }: { tipo: 'error' | 'ok' | 'advertencia' }) {
  const Icono = tipo === 'ok' ? LuCircleCheck : LuTriangleAlert
  return <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
}
