import type { ReactNode } from 'react'
import { claseBotonPrimario, claseTarjeta } from './estilos'

export function BloqueCarga({ filas = 4, alto = 'h-20' }: { filas?: number; alto?: string }) {
  return (
    <div className="animate-pulse flex flex-col gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={`${claseTarjeta} ${alto}`} />
      ))}
    </div>
  )
}

export function BloqueVacio({ icono, mensaje, children }: { icono: string; mensaje: string; children?: ReactNode }) {
  return (
    <div className={`${claseTarjeta} text-center py-16 px-4`}>
      <span className="text-6xl">{icono}</span>
      <p className="text-[#86efac] mt-4 text-lg">{mensaje}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

export function BloqueError({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="bg-[#111811] border border-red-700 rounded-xl p-8 text-center">
      <div className="text-5xl mb-3">⚠️</div>
      <p className="text-[#f0fdf4] font-semibold mb-1">No se pudo cargar</p>
      <p className="text-[#86efac] text-sm mb-5">{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar} className={claseBotonPrimario}>Reintentar</button>
      )}
    </div>
  )
}

export function AvisoError({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null
  return (
    <div role="alert" className="bg-red-900 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
      ⚠️ {mensaje}
    </div>
  )
}
