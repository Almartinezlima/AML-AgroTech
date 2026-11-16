import { claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { ETIQUETA_METODO, ETIQUETA_TIPO_ZONA } from '@/lib/ecommerce/presentacion'
import type { DetallePreparacion } from '@/types/almacen'

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
      <dt className="text-sm text-texto-2">{titulo}</dt>
      <dd className="min-w-0 break-words text-texto sm:text-right">{children}</dd>
    </div>
  )
}

// Para quién es y a dónde va (lo mismo que sale en la etiqueta)
export default function DatosEntrega({ pedido }: { pedido: DetallePreparacion }) {
  return (
    <section className={`${claseTarjeta} p-5`}>
      <h2 className={`${claseTituloSeccion} mb-3`}>Entrega</h2>
      <dl className="flex flex-col gap-2">
        <Fila titulo="Cliente">{pedido.cliente ?? '—'}</Fila>
        <Fila titulo="Teléfono">{pedido.telefono ?? '—'}</Fila>
        <Fila titulo="Zona">{pedido.zona ?? '—'}{pedido.tipo_zona ? ` · ${ETIQUETA_TIPO_ZONA[pedido.tipo_zona]}` : ''}</Fila>
        {pedido.direccion_entrega && <Fila titulo="Dirección">{pedido.direccion_entrega}</Fila>}
        {pedido.recoge_nombre && <Fila titulo="Recoge en la flota">{pedido.recoge_nombre}{pedido.recoge_ci ? ` · CI ${pedido.recoge_ci}` : ''}</Fila>}
        <Fila titulo="Pago">{ETIQUETA_METODO[pedido.metodo_pago]}</Fila>
        {pedido.notas && <Fila titulo="Notas del cliente">{pedido.notas}</Fila>}
      </dl>
    </section>
  )
}
