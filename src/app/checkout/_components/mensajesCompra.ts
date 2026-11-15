import { ErrorPedidoApi, mensajeDeError } from '@/lib/api/cliente'
import type { ItemCarrito } from '@/context/CarritoContext'

// Traduce los errores de la API del checkout a palabras simples: qué pasó y qué hacer.
export type ErrorCompra =
  | { tipo: 'stock'; mensaje: string; productoId: string; disponible: number }
  | { tipo: 'sesion' }
  | { tipo: 'otro'; mensaje: string }

export function errorDeCompra(causa: unknown, items: ItemCarrito[]): ErrorCompra {
  if (causa instanceof ErrorPedidoApi) {
    if (causa.codigo === 'NO_AUTENTICADO' || causa.estado === 401) return { tipo: 'sesion' }

    if (causa.codigo === 'STOCK_INSUFICIENTE') {
      const detalle = causa.detalle as { producto_id?: string; disponible?: number } | undefined
      const item = items.find((i) => i.id === detalle?.producto_id)
      if (detalle?.producto_id && item) {
        const disponible = Math.max(0, detalle.disponible ?? 0)
        const mensaje = disponible === 0
          ? `«${item.nombre}» se agotó y lo quitamos de tu carrito. Revisa tu compra y vuelve a confirmar.`
          : `Solo quedan ${disponible} de «${item.nombre}». Ajustamos la cantidad en tu carrito: revisa y vuelve a confirmar.`
        return { tipo: 'stock', mensaje, productoId: detalle.producto_id, disponible }
      }
      return { tipo: 'otro', mensaje: 'Algún producto ya no tiene suficientes unidades. Revisa tu carrito y vuelve a intentar.' }
    }
  }
  return { tipo: 'otro', mensaje: mensajeDeError(causa, 'No pudimos registrar tu pedido. Vuelve a intentar.') }
}

// Validación del paso "Datos y envío", con lo que falta y cómo completarlo
export const ERRORES_ENTREGA = {
  zona: 'Elige dónde quieres recibir tu pedido.',
  direccion: 'Escribe la dirección o comunidad donde te entregamos.',
  recogeNombre: 'Escribe el nombre de quien recoge la encomienda en la terminal.',
  recogeCi: 'Escribe un CI válido de quien recoge (ej.: 1234567 o 1234567-1B).',
  telefono: 'Escribe un teléfono válido, solo con números (ej.: 70012345), para coordinar la entrega.',
  metodo: 'Elige cómo quieres pagar.',
}
