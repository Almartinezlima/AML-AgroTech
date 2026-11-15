import { claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { fechaCorta } from '@/lib/abastecimiento/ordenes'
import { fechaHora } from '@/lib/ecommerce/presentacion'
import type { OrdenCompra } from '@/types/abastecimiento'

// Datos de la orden en lista "Dato: valor" (solo los que ya existen)
export default function DatosOrden({ orden }: { orden: OrdenCompra }) {
  const datos: Array<[string, string]> = []
  if (orden.enviada_en) datos.push(['Enviada', fechaHora(orden.enviada_en)])
  if (orden.fecha_estimada) datos.push(['Entrega estimada', fechaCorta(orden.fecha_estimada)])
  if (orden.transportista) datos.push(['Transportista', orden.transportista])
  if (orden.guia) datos.push(['Guía', orden.guia])
  if (orden.recibida_en) datos.push(['Recibida', fechaHora(orden.recibida_en)])
  if (orden.motivo) datos.push([orden.estado === 'rechazada' ? 'Motivo del rechazo' : 'Motivo', orden.motivo])
  if (orden.nota_recepcion) datos.push(['Nota de recepción', orden.nota_recepcion])

  if (datos.length === 0) return null

  return (
    <section className={`${claseTarjeta} p-4 sm:p-5`}>
      <h2 className={`${claseTituloSeccion} mb-3`}>Datos</h2>
      <dl className="flex flex-col gap-2 text-sm">
        {datos.map(([dato, valor]) => (
          <div key={dato} className="flex flex-wrap gap-x-1.5">
            <dt className="text-texto-2">{dato}:</dt>
            <dd className="min-w-0 break-words text-texto">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
