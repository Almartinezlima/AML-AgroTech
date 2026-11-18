import { ErrorPedidoApi, mensajeDeError } from '@/lib/api/cliente'
import type { ItemCarrito } from '@/context/CarritoContext'
import { REGEX_CI, REGEX_TELEFONO } from '@/lib/ecommerce/reglas'
import type { MetodoPago, ZonaEnvio } from '@/types/comercio'
import type { DatosEntrega } from './PasoEntrega'

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

// Campos del checkout, en el orden en que aparecen (el primero con error recibe el foco)
export const CAMPOS_COMPRA = ['zona', 'direccion', 'recogeNombre', 'recogeCi', 'telefono', 'metodo'] as const
export type CampoCompra = (typeof CAMPOS_COMPRA)[number]
export type ErroresCompra = Partial<Record<CampoCompra, string>>

// id del elemento de cada campo en la pantalla
export const ID_CAMPO: Record<CampoCompra, string> = {
  zona: 'zona',
  direccion: 'direccion',
  recogeNombre: 'recoge-nombre',
  recogeCi: 'recoge-ci',
  telefono: 'telefono',
  metodo: 'metodo',
}

// Qué falta y cómo completarlo
export const ERRORES_ENTREGA: Record<CampoCompra, string> = {
  zona: 'Elige dónde quieres recibir tu pedido.',
  direccion: 'Escribe la dirección o comunidad donde te entregamos.',
  recogeNombre: 'Escribe el nombre de quien recoge la encomienda en la terminal.',
  recogeCi: 'Escribe un CI válido de quien recoge (ej.: 1234567 o 1234567-1B).',
  telefono: 'Escribe un teléfono válido, solo con números (ej.: 70012345), para coordinar la entrega.',
  metodo: 'Elige cómo quieres pagar.',
}

export const TEXTO_SOLO_EFECTIVO = 'Efectivo al recibir solo en Recojo en tienda y Distrito 1'

export function validarCompra(entrega: DatosEntrega, zona: ZonaEnvio | undefined, metodo: MetodoPago | null): ErroresCompra {
  const errores: ErroresCompra = {}
  if (!zona) errores.zona = ERRORES_ENTREGA.zona
  if (zona?.tipo === 'urbano' && !entrega.direccion.trim()) errores.direccion = ERRORES_ENTREGA.direccion
  if (zona?.tipo === 'provincia') {
    if (entrega.recogeNombre.trim().length < 3) errores.recogeNombre = ERRORES_ENTREGA.recogeNombre
    if (!REGEX_CI.test(entrega.recogeCi.trim())) errores.recogeCi = ERRORES_ENTREGA.recogeCi
  }
  if (!REGEX_TELEFONO.test(entrega.telefono.trim())) errores.telefono = ERRORES_ENTREGA.telefono
  if (!metodo) errores.metodo = ERRORES_ENTREGA.metodo
  else if (metodo === 'contra_entrega' && zona && !zona.permite_contra_entrega) errores.metodo = `${TEXTO_SOLO_EFECTIVO}. Elige QR.`
  return errores
}

// Lleva la vista al primer campo con error y le da el foco
export function enfocarPrimerError(errores: ErroresCompra) {
  const campo = CAMPOS_COMPRA.find((c) => errores[c])
  if (!campo) return
  const elemento = document.getElementById(ID_CAMPO[campo])
  if (!elemento) return
  // En los grupos de opciones el foco va a la opción marcada o a la primera
  const enfocable = elemento.matches('input, textarea, select')
    ? elemento
    : elemento.querySelector<HTMLElement>('input:checked:not(:disabled), input:not(:disabled)')
  elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
  enfocable?.focus({ preventScroll: true })
}
