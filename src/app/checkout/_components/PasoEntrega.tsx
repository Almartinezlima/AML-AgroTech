import { LuStore } from 'react-icons/lu'
import { claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { ETIQUETA_TIPO_ZONA, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { ZonaEnvio } from '@/types/comercio'

export interface DatosEntrega {
  zonaId: string
  direccion: string
  // Zonas por flota: quién recoge la encomienda en la terminal
  recogeNombre: string
  recogeCi: string
  telefono: string
  notas: string
}

interface PasoEntregaProps {
  zonas: ZonaEnvio[]
  datos: DatosEntrega
  onCambiar: (cambios: Partial<DatosEntrega>) => void
}

// Grupos del checkout según el tipo de zona: una zona nueva del admin cae sola en su grupo
const GRUPOS = [
  { titulo: 'Villa Charcas y sus distritos', tipos: ['recojo', 'urbano'] },
  { titulo: 'Otros municipios', tipos: ['provincia'] },
] as const

export default function PasoEntrega({ zonas, datos, onCambiar }: PasoEntregaProps) {
  const zona = zonas.find((z) => z.id === datos.zonaId)
  const grupos = GRUPOS
    .map((g) => ({ titulo: g.titulo, zonas: zonas.filter((z) => (g.tipos as readonly string[]).includes(z.tipo)) }))
    .filter((g) => g.zonas.length > 0)

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4">
        <legend className={claseEtiqueta}>¿Dónde recibes tu pedido?</legend>
        {grupos.map((grupo, i) => (
          <div key={grupo.titulo} role="group" aria-labelledby={`grupo-zonas-${i}`} className="flex flex-col gap-3">
            <p id={`grupo-zonas-${i}`} className="text-sm font-semibold text-texto">{grupo.titulo}</p>
            {grupo.zonas.map((z) => (
              <label key={z.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-tarjeta p-4 transition hover:border-acento ${z.id === datos.zonaId ? 'border-acento ring-2 ring-acento/20' : 'border-borde'}`}>
                <input type="radio" name="zona" checked={z.id === datos.zonaId} onChange={() => onCambiar({ zonaId: z.id })} className="h-5 w-5 accent-acento" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-texto">{z.nombre}</span>
                  <span className="block text-sm text-texto-2">{ETIQUETA_TIPO_ZONA[z.tipo]} · {tiempoEntrega(z)}</span>
                </span>
                <span className="whitespace-nowrap font-bold text-acento">{z.costo === 0 ? 'Gratis' : formatoBs(z.costo)}</span>
              </label>
            ))}
          </div>
        ))}
      </fieldset>

      {zona?.tipo === 'recojo' && (
        <p className="flex items-start gap-3 rounded-2xl bg-tarjeta-hover p-4 text-sm text-texto">
          <LuStore className="mt-0.5 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
          Te avisamos por WhatsApp cuando tu pedido esté listo para recoger en la tienda de Villa Charcas.
        </p>
      )}

      {zona?.tipo === 'urbano' && (
        <div>
          <label htmlFor="direccion" className={claseEtiqueta}>Dirección o comunidad de entrega</label>
          <textarea id="direccion" rows={2} maxLength={300} value={datos.direccion} onChange={(e) => onCambiar({ direccion: e.target.value })}
            placeholder="Ej.: Calle Sucre, a media cuadra de la plaza · o tu comunidad y una referencia" className={`${claseInput} resize-none`} />
        </div>
      )}

      {zona?.tipo === 'provincia' && (
        <div className="grid gap-4 rounded-2xl border border-borde bg-tarjeta-hover/60 p-4 sm:grid-cols-[1fr_200px]">
          <p className="text-sm text-texto sm:col-span-2">
            Enviamos por flota. En la terminal la encomienda se entrega a la persona que indiques, con su carnet.
          </p>
          <div>
            <label htmlFor="recoge-nombre" className={claseEtiqueta}>Nombre de quien recoge</label>
            <input id="recoge-nombre" maxLength={100} autoComplete="name" value={datos.recogeNombre} onChange={(e) => onCambiar({ recogeNombre: e.target.value })}
              placeholder="Ej.: Juan Mamani Flores" className={claseInput} />
          </div>
          <div>
            <label htmlFor="recoge-ci" className={claseEtiqueta}>CI de quien recoge</label>
            <input id="recoge-ci" maxLength={14} inputMode="text" value={datos.recogeCi} onChange={(e) => onCambiar({ recogeCi: e.target.value })}
              placeholder="Ej.: 1234567" className={claseInput} />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="telefono" className={claseEtiqueta}>Teléfono / WhatsApp</label>
        <input id="telefono" type="tel" inputMode="tel" autoComplete="tel" value={datos.telefono} onChange={(e) => onCambiar({ telefono: e.target.value })} placeholder="Ej.: 70012345" className={claseInput} />
      </div>

      <div>
        <label htmlFor="notas" className={claseEtiqueta}>Notas (opcional)</label>
        <textarea id="notas" rows={2} maxLength={500} value={datos.notas} onChange={(e) => onCambiar({ notas: e.target.value })} className={`${claseInput} resize-none`} />
      </div>
    </div>
  )
}
