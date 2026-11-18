import type { ReactNode } from 'react'
import { LuCircleAlert, LuCircleCheck } from 'react-icons/lu'
import { diaHora } from '@/lib/ecommerce/presentacion'
import type { FaltantePedido } from '@/types/comercio'

interface ListaFaltantesProps {
  faltantes: FaltantePedido[]
  // Botón "Repuesto, continuar" del admin para un faltante abierto
  accion?: (faltante: FaltantePedido) => ReactNode
}

// Faltantes reportados al preparar: abiertos en rojo, resueltos en verde (admin)
export default function ListaFaltantes({ faltantes, accion }: ListaFaltantesProps) {
  return (
    <ul className="flex flex-col gap-2">
      {faltantes.map((f) => {
        const abierto = !f.resuelto_en
        return (
          <li key={f.id} className={`rounded-xl border px-3 py-2.5 ${abierto ? 'border-estado-error/40 bg-estado-error/5' : 'border-borde bg-tarjeta-hover/40'}`}>
            <p className={`inline-flex items-center gap-1.5 font-semibold ${abierto ? 'text-estado-error-texto' : 'text-estado-ok-texto'}`}>
              {abierto
                ? <><LuCircleAlert className="h-4 w-4" aria-hidden="true" /> Faltante sin resolver</>
                : <><LuCircleCheck className="h-4 w-4" aria-hidden="true" /> Resuelto</>}
            </p>
            <p className="break-words text-texto">{f.producto ? <><span className="font-semibold">{f.producto}:</span> </> : null}{f.nota}</p>
            <p className="text-sm text-texto-2">Reportó {f.reportado_por ?? '—'} · {diaHora(f.created_at)}</p>
            {f.resuelto_en && (
              <p className="text-sm text-texto-2 break-words">
                Resolvió {f.resuelto_por ?? '—'} · {diaHora(f.resuelto_en)}{f.nota_resolucion ? ` · ${f.nota_resolucion}` : ''}
              </p>
            )}
            {abierto && accion && <div className="mt-2">{accion(f)}</div>}
          </li>
        )
      })}
    </ul>
  )
}
