import type { ReactNode } from 'react'
import { claseTituloAdmin } from '@/components/ui/estilos'

interface EncabezadoAdminProps {
  titulo: string
  // Para qué sirve la pantalla, en una línea
  descripcion?: ReactNode
  // Interruptor de pruebas, botón "Nuevo", exportar…
  acciones?: ReactNode
}

// Encabezado común de las pantallas del panel: título, para qué sirve y acciones a la derecha
export default function EncabezadoAdmin({ titulo, descripcion, acciones }: EncabezadoAdminProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className={`${claseTituloAdmin} break-words`}>{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-prose text-texto-2">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{acciones}</div>}
    </header>
  )
}
