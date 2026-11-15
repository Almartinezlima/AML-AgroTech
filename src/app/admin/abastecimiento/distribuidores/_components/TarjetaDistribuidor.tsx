import { LuMessageCircle, LuPencil } from 'react-icons/lu'
import TarjetaPresentacion from '@/components/abastecimiento/TarjetaPresentacion'
import Insignia, { INSIGNIA_ACTIVO, INSIGNIA_INACTIVO } from '@/components/ui/Insignia'
import { claseBoton, claseEnlace, claseTarjeta } from '@/components/ui/estilos'
import { numeroWhatsApp } from '@/lib/abastecimiento/ordenes'
import type { DistribuidorAdmin } from '@/types/abastecimiento'

const INSIGNIA_PRUEBA = { etiqueta: 'Cuenta de prueba', color: '#3b82f6' }

interface TarjetaDistribuidorProps {
  distribuidor: DistribuidorAdmin
  onEditar: () => void
}

// Ficha de un proveedor en el panel: datos, cuenta y lo que vende (plegable)
export default function TarjetaDistribuidor({ distribuidor: d, onEditar }: TarjetaDistribuidorProps) {
  const activas = d.presentaciones.filter((p) => p.activo)
  const whatsapp = numeroWhatsApp(d.telefono)

  return (
    <li className={claseTarjeta}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 p-4">
        <div className="min-w-0">
          <p className="font-titulo text-lg font-bold text-texto break-words">{d.nombre_comercial}</p>
          <p className="text-sm text-texto-2">{d.ciudad} · entrega en {d.dias_entrega} día{d.dias_entrega === 1 ? '' : 's'}{d.nit ? ` · NIT ${d.nit}` : ''}</p>
          <p className="text-sm text-texto-2 break-all">{d.cuenta?.email ?? 'Sin cuenta'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d.es_prueba && <Insignia info={INSIGNIA_PRUEBA} />}
          <Insignia info={d.activo ? INSIGNIA_ACTIVO : INSIGNIA_INACTIVO} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <button onClick={onEditar} className={claseBoton('secundario', 'chico')}>
          <LuPencil className="h-4 w-4" aria-hidden="true" /> Editar ficha
        </button>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={claseBoton('suave', 'chico')}>
            <LuMessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp {d.telefono}
          </a>
        )}
      </div>

      <details className="group border-t border-borde">
        <summary className={`${claseEnlace} flex min-h-11 cursor-pointer list-none items-center px-4 py-2 text-sm`}>
          <span className="group-open:hidden">Ver lo que vende ({activas.length} presentaci{activas.length === 1 ? 'ón' : 'ones'})</span>
          <span className="hidden group-open:inline">Ocultar presentaciones</span>
        </summary>
        <div className="px-4 pb-4">
          {d.presentaciones.length === 0 ? (
            <p className="text-sm text-texto-2">Todavía no cargó presentaciones.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {d.presentaciones.map((p) => <TarjetaPresentacion key={p.id} presentacion={p} diasFicha={d.dias_entrega} />)}
            </ul>
          )}
        </div>
      </details>
    </li>
  )
}
