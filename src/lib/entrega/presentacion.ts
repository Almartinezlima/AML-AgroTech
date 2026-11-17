// Textos de la entrega y el cierre (fase 9D). Sirven en el navegador y en el servidor (nota PDF).
import { diaHora, fechaHora } from '@/lib/ecommerce/presentacion'
import type { EventoSeguimiento } from '@/types/comercio'

export const MAX_INTENTOS_CODIGO = 5

export const TEXTO_CODIGO_CLIENTE = 'Dáselo a quien te entregue, solo cuando tengas tu pedido en la mano.'

// verificar_pago deja "Pago verificado"; la 0018 agrega "Pago verificado · efectivo recibido Bs. …"
// y "Pago verificado · cobro en efectivo Bs. …" (cuando cobra el admin)
export const esVerificacionPago = (evento: Pick<EventoSeguimiento, 'nota'>) =>
  Boolean(evento.nota?.startsWith('Pago verificado'))

// "efectivo recibido Bs. 30,00" (lo que va después de "Pago verificado · ")
export const detalleVerificacion = (evento: Pick<EventoSeguimiento, 'nota'>) =>
  evento.nota?.split(' · ').slice(1).join(' · ') || null

// "Pago verificado por Aldo Martínez · 16/11 14:32" (línea de tiempo) o con el año (nota PDF)
export function textoVerificacion(evento: EventoSeguimiento, conAnio = false) {
  const quien = evento.actor_nombre ?? 'la tienda'
  const cuando = conAnio ? fechaHora(evento.created_at) : diaHora(evento.created_at)
  return `Pago verificado por ${quien} · ${cuando}`
}

export function ultimaVerificacion(eventos: EventoSeguimiento[]) {
  return [...eventos].reverse().find(esVerificacionPago) ?? null
}

// Teléfono boliviano de 8 dígitos → +591. Si ya trae el código de país, se respeta.
function soloDigitos(telefono: string) {
  const digitos = telefono.replace(/\D/g, '')
  return digitos.length === 8 ? `591${digitos}` : digitos
}

export const enlaceLlamar = (telefono: string) => `tel:+${soloDigitos(telefono)}`

export const enlaceWhatsApp = (telefono: string, codigoPedido: string) =>
  `https://wa.me/${soloDigitos(telefono)}?text=${encodeURIComponent(`Hola, soy de AML AgroTech. Estoy llevando tu pedido ${codigoPedido}.`)}`
