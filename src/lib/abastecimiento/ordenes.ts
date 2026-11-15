import { formatoBs } from '@/lib/utils'
import type { EstadoOrdenCompra, LineaOrdenCompra, OrdenCompraDetalle } from '@/types/abastecimiento'
import { cantidadConUnidad } from './presentacion'

// Colores de estado del sitio (docs/DISENO.md): Insignia los traduce a su tono oscuro
export const INFO_ESTADO_ORDEN: Record<EstadoOrdenCompra, { etiqueta: string; color: string }> = {
  borrador: { etiqueta: 'Borrador', color: '#f59e0b' },
  enviada: { etiqueta: 'Enviada', color: '#f59e0b' },
  aceptada: { etiqueta: 'Aceptada', color: '#3b82f6' },
  despachada: { etiqueta: 'Despachada', color: '#3b82f6' },
  recibida: { etiqueta: 'Recibida', color: '#22c55e' },
  rechazada: { etiqueta: 'Rechazada', color: '#ef4444' },
  cancelada: { etiqueta: 'Cancelada', color: '#ef4444' },
}

// Qué falta en cada estado (una línea debajo del título)
export const QUE_SIGUE_ADMIN: Record<EstadoOrdenCompra, string> = {
  borrador: 'Revisa las cantidades y envíasela al proveedor.',
  enviada: 'Espera que el proveedor la acepte con su fecha de entrega.',
  aceptada: 'El proveedor la está preparando. Te avisa cuando la despache.',
  despachada: 'Está en camino. Cuando llegue, registra lo que recibiste.',
  recibida: 'Mercadería en el inventario y costo actualizado.',
  rechazada: 'El proveedor no puede atenderla.',
  cancelada: 'La orden se canceló.',
}

export const QUE_SIGUE_PROVEEDOR: Record<EstadoOrdenCompra, string> = {
  borrador: '',
  enviada: 'Acéptala con la fecha en que la entregas, o recházala si no puedes atenderla.',
  aceptada: 'Cuando la mandes, marca «Despachar» con el transportista y la guía.',
  despachada: 'En camino a la tienda.',
  recibida: 'La tienda ya la recibió.',
  rechazada: 'Rechazaste esta orden.',
  cancelada: 'La tienda canceló esta orden.',
}

export const ETIQUETA_SEGUIMIENTO_ORDEN: Record<EstadoOrdenCompra, string> = {
  borrador: 'Orden armada',
  enviada: 'Enviada al proveedor',
  aceptada: 'Aceptada',
  despachada: 'Despachada',
  recibida: 'Recibida en la tienda',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
}

// Valores efectivos de la línea: la copia guardada al enviar o, en borrador, la presentación vigente
export function valoresLinea(linea: LineaOrdenCompra) {
  const unidades = linea.unidades_por_presentacion ?? linea.presentacion?.unidades_por_presentacion ?? 1
  const precio = Number(linea.precio_unitario ?? linea.presentacion?.precio_mayorista ?? 0)
  return {
    nombre: linea.nombre_presentacion ?? linea.presentacion?.nombre ?? 'Presentación',
    unidades,
    precio,
    subtotal: precio * linea.cantidad,
    costoUnidad: unidades > 0 ? precio / unidades : 0,
    unidad: linea.producto?.unidad ?? 'unidad',
  }
}

// "3 × Bidón 20 L = 60 litros"
export function textoFraccionamiento(cantidad: number, linea: LineaOrdenCompra) {
  const v = valoresLinea(linea)
  return `${cantidad} × ${v.nombre} = ${cantidadConUnidad(cantidad * v.unidades, v.unidad)}`
}

// Cantidad sugerida en presentaciones: techo((2 × mínimo − stock) ÷ unidades), mínimo 1
export function cantidadSugerida(stock: number, minimo: number, unidades: number) {
  if (unidades < 1) return 1
  return Math.max(1, Math.ceil((2 * minimo - stock) / unidades))
}

// Promedio ponderado (igual que aml_costo_promedio de la 0015)
export function costoPromedio(stock: number, promedio: number | null, unidades: number, costo: number) {
  if (promedio === null || stock <= 0) return costo
  return (stock * promedio + unidades * costo) / (stock + unidades)
}

// Número para wa.me: solo dígitos; los de 8 cifras son celulares de Bolivia (+591)
export function numeroWhatsApp(telefono: string | null | undefined) {
  const digitos = (telefono ?? '').replace(/\D/g, '')
  if (!digitos) return null
  return digitos.length === 8 ? `591${digitos}` : digitos
}

// Texto del aviso al proveedor por WhatsApp (no se le manda Telegram)
export function textoWhatsAppOrden(orden: OrdenCompraDetalle, origen: string) {
  const lineas = orden.lineas
    .filter((l) => l.cantidad > 0)
    .map((l) => {
      const v = valoresLinea(l)
      return `• ${l.cantidad} × ${v.nombre} (${l.producto?.nombre ?? 'producto'}) = ${formatoBs(v.subtotal)}`
    })
  return [
    `Hola ${orden.distribuidor?.nombre_comercial ?? ''}, te enviamos la orden de compra ${orden.codigo} de AML AgroTech:`,
    ...lineas,
    `Total: ${formatoBs(orden.total)}`,
    `Acéptala con tu fecha de entrega en ${origen}/distribuidor/ordenes/${orden.id}`,
  ].join('\n')
}

export const fechaCorta = (fecha: string) => {
  // AAAA-MM-DD de la base → DD/MM/AAAA, sin pasar por Date (evita el corrimiento de zona)
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
