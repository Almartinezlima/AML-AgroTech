import { claseEtiqueta, claseInput, claseTarjeta } from '@/components/ui/estilos'
import { ETIQUETA_TIPO_ZONA, tiempoEntrega } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { ZonaEnvio } from '@/types/comercio'

export interface DatosEntrega {
  zonaId: string
  direccion: string
  telefono: string
  notas: string
}

interface PasoEntregaProps {
  zonas: ZonaEnvio[]
  datos: DatosEntrega
  onCambiar: (cambios: Partial<DatosEntrega>) => void
}

export default function PasoEntrega({ zonas, datos, onCambiar }: PasoEntregaProps) {
  const zona = zonas.find((z) => z.id === datos.zonaId)

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className={claseEtiqueta}>¿Dónde recibes tu pedido?</legend>
        {zonas.map((z) => (
          <label key={z.id} className={`${claseTarjeta} p-4 flex items-center gap-3 cursor-pointer hover:border-[#22c55e] ${z.id === datos.zonaId ? 'border-[#22c55e] bg-[#162016]' : ''}`}>
            <input type="radio" name="zona" checked={z.id === datos.zonaId} onChange={() => onCambiar({ zonaId: z.id })} className="accent-[#22c55e]" />
            <span className="flex-1 min-w-0">
              <span className="block text-[#f0fdf4] font-semibold">{z.nombre}</span>
              <span className="block text-[#86efac] text-xs">{ETIQUETA_TIPO_ZONA[z.tipo]} · {tiempoEntrega(z)}</span>
            </span>
            <span className="text-[#22c55e] font-bold whitespace-nowrap">{z.costo === 0 ? 'Gratis' : formatoBs(z.costo)}</span>
          </label>
        ))}
      </fieldset>

      {zona && zona.tipo !== 'recojo' && (
        <div>
          <label htmlFor="direccion" className={claseEtiqueta}>
            {zona.tipo === 'provincia' ? 'Dirección o referencia para la encomienda' : 'Dirección de entrega'}
          </label>
          <textarea id="direccion" rows={2} maxLength={300} value={datos.direccion} onChange={(e) => onCambiar({ direccion: e.target.value })} className={`${claseInput} resize-none`} />
        </div>
      )}

      <div>
        <label htmlFor="telefono" className={claseEtiqueta}>Teléfono / WhatsApp</label>
        <input id="telefono" type="tel" value={datos.telefono} onChange={(e) => onCambiar({ telefono: e.target.value })} placeholder="Ej: 70012345" className={claseInput} />
      </div>

      <div>
        <label htmlFor="notas" className={claseEtiqueta}>Notas (opcional)</label>
        <textarea id="notas" rows={2} maxLength={500} value={datos.notas} onChange={(e) => onCambiar({ notas: e.target.value })} className={`${claseInput} resize-none`} />
      </div>
    </div>
  )
}
