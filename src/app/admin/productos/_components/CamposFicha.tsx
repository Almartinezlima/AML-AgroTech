import { claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { INFO_BANDA, INFO_TENDENCIA } from '@/lib/ecommerce/fichaTecnica'
import { BANDAS_TOXICOLOGICAS, TENDENCIAS_PRECIO, type Producto } from '@/types/comercio'

// Campos de texto del formulario (vacío = sin dato)
export interface FormFicha {
  composicion: string
  cultivos: string
  modo_uso: string
  dosis: string
  banda_toxicologica: string
  precio_referencia: string
  fuente_precio: string
  fecha_precio: string
  tendencia_precio: string
}

export const fichaInicial = (producto: Producto | null): FormFicha => ({
  composicion: producto?.composicion ?? '',
  cultivos: producto?.cultivos ?? '',
  modo_uso: producto?.modo_uso ?? '',
  dosis: producto?.dosis ?? '',
  banda_toxicologica: producto?.banda_toxicologica ?? '',
  precio_referencia: producto?.precio_referencia != null ? String(producto.precio_referencia) : '',
  fuente_precio: producto?.fuente_precio ?? '',
  fecha_precio: producto?.fecha_precio ?? '',
  tendencia_precio: producto?.tendencia_precio ?? '',
})

// Lo que se manda a la API. La banda solo va en Agroquímicos (la base también lo exige).
export const cuerpoFicha = (ficha: FormFicha, esAgroquimico: boolean) => {
  const texto = (valor: string) => valor.trim() || null
  return {
    composicion: texto(ficha.composicion),
    cultivos: texto(ficha.cultivos),
    modo_uso: texto(ficha.modo_uso),
    dosis: texto(ficha.dosis),
    banda_toxicologica: esAgroquimico ? texto(ficha.banda_toxicologica) : null,
    precio_referencia: ficha.precio_referencia.trim() ? Number(ficha.precio_referencia) : null,
    fuente_precio: texto(ficha.fuente_precio),
    fecha_precio: texto(ficha.fecha_precio),
    tendencia_precio: texto(ficha.tendencia_precio),
  }
}

interface CamposFichaProps {
  ficha: FormFicha
  esAgroquimico: boolean
  onCambiar: (cambios: Partial<FormFicha>) => void
}

export default function CamposFicha({ ficha, esAgroquimico, onCambiar }: CamposFichaProps) {
  return (
    <>
      <fieldset className="flex flex-col gap-4 rounded-xl border border-borde p-4">
        <legend className="px-1 text-sm font-semibold text-texto">Ficha técnica (opcional)</legend>
        <div><label htmlFor="p-composicion" className={claseEtiqueta}>Composición (ingrediente activo o N-P-K)</label><input id="p-composicion" maxLength={200} value={ficha.composicion} onChange={(e) => onCambiar({ composicion: e.target.value })} className={claseInput} /></div>
        <div><label htmlFor="p-cultivos" className={claseEtiqueta}>Cultivos</label><input id="p-cultivos" maxLength={300} placeholder="Papa, maíz, hortalizas" value={ficha.cultivos} onChange={(e) => onCambiar({ cultivos: e.target.value })} className={claseInput} /></div>
        <div><label htmlFor="p-modo" className={claseEtiqueta}>Modo de uso</label><textarea id="p-modo" rows={2} maxLength={1000} value={ficha.modo_uso} onChange={(e) => onCambiar({ modo_uso: e.target.value })} className={`${claseInput} resize-none`} /></div>
        <div><label htmlFor="p-dosis" className={claseEtiqueta}>Dosis</label><input id="p-dosis" maxLength={300} value={ficha.dosis} onChange={(e) => onCambiar({ dosis: e.target.value })} className={claseInput} /></div>
        {esAgroquimico && (
          <div>
            <label htmlFor="p-banda" className={claseEtiqueta}>Banda toxicológica</label>
            <select id="p-banda" value={ficha.banda_toxicologica} onChange={(e) => onCambiar({ banda_toxicologica: e.target.value })} className={claseInput}>
              <option value="">Sin banda (fertilizantes)</option>
              {BANDAS_TOXICOLOGICAS.map((b) => <option key={b} value={b}>{INFO_BANDA[b].etiqueta} — {INFO_BANDA[b].peligro}</option>)}
            </select>
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-borde p-4">
        <legend className="px-1 text-sm font-semibold text-texto">Precio de mercado (opcional)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label htmlFor="p-ref" className={claseEtiqueta}>Precio de referencia (Bs.)</label><input id="p-ref" type="number" min="0.01" step="0.01" value={ficha.precio_referencia} onChange={(e) => onCambiar({ precio_referencia: e.target.value })} className={claseInput} /></div>
          <div><label htmlFor="p-fecha" className={claseEtiqueta}>Fecha del precio</label><input id="p-fecha" type="date" value={ficha.fecha_precio} onChange={(e) => onCambiar({ fecha_precio: e.target.value })} className={claseInput} /></div>
          <div><label htmlFor="p-fuente" className={claseEtiqueta}>Fuente</label><input id="p-fuente" maxLength={150} placeholder="Tienda, mercado o ciudad" value={ficha.fuente_precio} onChange={(e) => onCambiar({ fuente_precio: e.target.value })} className={claseInput} /></div>
          <div>
            <label htmlFor="p-tendencia" className={claseEtiqueta}>Tendencia del mercado</label>
            <select id="p-tendencia" value={ficha.tendencia_precio} onChange={(e) => onCambiar({ tendencia_precio: e.target.value })} className={claseInput}>
              <option value="">Sin dato</option>
              {TENDENCIAS_PRECIO.map((t) => <option key={t} value={t}>{INFO_TENDENCIA[t].etiqueta}</option>)}
            </select>
          </div>
        </div>
      </fieldset>
    </>
  )
}
