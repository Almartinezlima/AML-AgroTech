// Solo servidor: lo importa la ruta /api/pedidos/[id]/nota
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO, INFO_ESTADO_PEDIDO, fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { EstadoPago, EstadoPedido, MetodoPago, TipoZona } from '@/types/comercio'

// Nota de venta en PDF (fase 7): carta, Helvetica (viene con pdfkit y cubre á, ñ, ¿, º)
// y legible en blanco y negro: el verde solo va en la franja y los títulos.

export interface ItemNota {
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
  productos: { unidad: string | null } | null
}

export interface DatosNotaPdf {
  id: string
  codigo: string
  created_at: string
  estado: EstadoPedido
  estado_pago: EstadoPago
  metodo_pago: MetodoPago
  subtotal: number
  costo_envio: number
  total: number
  direccion_entrega: string | null
  telefono_contacto: string | null
  recoge_nombre: string | null
  recoge_ci: string | null
  zonas_envio: { nombre: string; tipo: TipoZona } | null
  pedido_items: ItemNota[]
  cliente: { nombre: string; telefono: string | null } | null
  anulada: boolean
  enlacePedido: string
  whatsapp?: string | null
}

const VERDE = '#15753a'
const TEXTO = '#17251b'
const GRIS = '#4a5a4e'
const LINEA = '#9aa59c'
const ROJO = '#b91c1c'

const MARGEN = 48
const ANCHO = 612 // carta: 8,5 × 11 pulgadas
const ALTO = 792
const UTIL = ANCHO - MARGEN * 2
const PIE = ALTO - MARGEN - 28

// Columnas de la tabla de productos
const COL = { cantidad: MARGEN, producto: MARGEN + 96, unitario: MARGEN + UTIL - 180, subtotal: MARGEN + UTIL - 90 }
const ANCHO_COL = { cantidad: 90, producto: UTIL - 96 - 186, unitario: 86, subtotal: 90 }

type Doc = PDFKit.PDFDocument

function textoPago(datos: DatosNotaPdf) {
  if (datos.metodo_pago === 'contra_entrega' && datos.estado_pago === 'pendiente') return 'Se paga al recibir'
  return INFO_ESTADO_PAGO[datos.estado_pago].etiqueta
}

function lineasEntrega(datos: DatosNotaPdf): string[] {
  const lineas = [datos.zonas_envio?.nombre ?? 'Sin zona']
  if (datos.zonas_envio?.tipo === 'recojo') lineas.push('Recoge en la tienda de Villa Charcas')
  if (datos.direccion_entrega) lineas.push(`Dirección: ${datos.direccion_entrega}`)
  if (datos.recoge_nombre) lineas.push(`Recoge en la flota: ${datos.recoge_nombre}${datos.recoge_ci ? ` · CI ${datos.recoge_ci}` : ''}`)
  return lineas
}

function encabezado(doc: Doc, datos: DatosNotaPdf) {
  doc.rect(0, 0, ANCHO, 10).fill(VERDE)

  doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(22).text('AML AgroTech', MARGEN, MARGEN)
  doc.fillColor(GRIS).font('Helvetica').fontSize(10)
    .text('Insumos agrícolas · Villa Charcas, Chuquisaca, Bolivia', MARGEN, MARGEN + 28)
  if (datos.whatsapp) doc.text(`WhatsApp: +${datos.whatsapp}`, MARGEN, MARGEN + 42)

  const derecha = { width: 220, align: 'right' as const }
  const x = MARGEN + UTIL - 220
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(14).text('NOTA DE VENTA', x, MARGEN, derecha)
  doc.font('Helvetica-Bold').fontSize(12).text(`N.º ${datos.codigo}`, x, MARGEN + 20, derecha)
  doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(`${fechaHora(datos.created_at)} (hora de Bolivia)`, x, MARGEN + 38, derecha)

  // Leyenda: no es factura
  const y = MARGEN + 64
  doc.lineWidth(1).strokeColor(TEXTO).rect(MARGEN, y, UTIL, 24).stroke()
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(10)
    .text('Nota de venta — documento sin valor fiscal (no es factura)', MARGEN, y + 7, { width: UTIL, align: 'center' })
  return y + 40
}

// Bloque con título y líneas; devuelve dónde terminó
function bloque(doc: Doc, titulo: string, lineas: string[], x: number, y: number, ancho: number) {
  doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(10).text(titulo.toUpperCase(), x, y, { width: ancho, characterSpacing: 0.5 })
  doc.fillColor(TEXTO).font('Helvetica').fontSize(10.5)
  let fin = y + 16
  for (const linea of lineas) {
    doc.text(linea, x, fin, { width: ancho })
    fin = doc.y + 2
  }
  return fin
}

function filaEncabezadoTabla(doc: Doc, y: number) {
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(10)
  doc.text('Cantidad', COL.cantidad, y, { width: ANCHO_COL.cantidad })
  doc.text('Producto', COL.producto, y, { width: ANCHO_COL.producto })
  doc.text('P. unitario', COL.unitario, y, { width: ANCHO_COL.unitario, align: 'right' })
  doc.text('Subtotal', COL.subtotal, y, { width: ANCHO_COL.subtotal, align: 'right' })
  doc.lineWidth(1.2).strokeColor(TEXTO).moveTo(MARGEN, y + 16).lineTo(MARGEN + UTIL, y + 16).stroke()
  return y + 24
}

function tabla(doc: Doc, datos: DatosNotaPdf, inicio: number) {
  let y = filaEncabezadoTabla(doc, inicio)
  doc.font('Helvetica').fontSize(10.5)

  for (const item of datos.pedido_items) {
    const cantidad = cantidadConUnidad(Number(item.cantidad), item.productos?.unidad)
    const alto = Math.max(
      doc.heightOfString(item.nombre_producto, { width: ANCHO_COL.producto }),
      doc.heightOfString(cantidad, { width: ANCHO_COL.cantidad })
    ) + 10

    // Si no entra, sigue en otra página con el encabezado de la tabla
    if (y + alto > PIE - 20) {
      doc.addPage()
      y = filaEncabezadoTabla(doc, MARGEN + 10)
      doc.font('Helvetica').fontSize(10.5)
    }

    doc.fillColor(TEXTO)
    doc.text(cantidad, COL.cantidad, y, { width: ANCHO_COL.cantidad })
    doc.text(item.nombre_producto, COL.producto, y, { width: ANCHO_COL.producto })
    doc.text(formatoBs(item.precio_unitario), COL.unitario, y, { width: ANCHO_COL.unitario, align: 'right' })
    doc.text(formatoBs(item.subtotal), COL.subtotal, y, { width: ANCHO_COL.subtotal, align: 'right' })
    y += alto
    doc.lineWidth(0.5).strokeColor(LINEA).moveTo(MARGEN, y - 5).lineTo(MARGEN + UTIL, y - 5).stroke()
  }
  return y
}

async function totalesYQr(doc: Doc, datos: DatosNotaPdf, inicio: number) {
  const ALTO_BLOQUE = 110
  let y = inicio + 6
  if (y + ALTO_BLOQUE > PIE) {
    doc.addPage()
    y = MARGEN + 10
  }

  // Totales a la derecha
  const xEtiqueta = MARGEN + UTIL - 250
  const fila = (etiqueta: string, valor: string, yFila: number, fuerte = false) => {
    doc.font(fuerte ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuerte ? 14 : 10.5).fillColor(fuerte ? VERDE : TEXTO)
    doc.text(etiqueta, xEtiqueta, yFila, { width: 150 })
    doc.text(valor, MARGEN + UTIL - 110, yFila, { width: 110, align: 'right' })
  }
  fila('Subtotal', formatoBs(datos.subtotal), y)
  // La zona ya va en "Entrega": aquí solo el costo, para que no se parta en dos líneas
  fila('Envío', formatoBs(datos.costo_envio), y + 18)
  doc.lineWidth(1.2).strokeColor(TEXTO).moveTo(xEtiqueta, y + 40).lineTo(MARGEN + UTIL, y + 40).stroke()
  fila('TOTAL', formatoBs(datos.total), y + 48, true)

  // QR pequeño con el enlace al pedido (pide sesión: no expone datos)
  const qr = await QRCode.toBuffer(datos.enlacePedido, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
  doc.image(qr, MARGEN, y, { width: 78, height: 78 })
  doc.fillColor(GRIS).font('Helvetica').fontSize(9)
    .text('Escanea para ver el pedido en línea', MARGEN + 86, y + 22, { width: 120 })
}

function marcaAnulada(doc: Doc) {
  doc.save()
  doc.rotate(-35, { origin: [ANCHO / 2, ALTO / 2] })
  doc.fillColor(ROJO).fillOpacity(0.18).font('Helvetica-Bold').fontSize(120)
    .text('ANULADA', 0, ALTO / 2 - 60, { width: ANCHO, align: 'center', lineBreak: false })
  doc.restore()
  doc.fillOpacity(1)
}

function pie(doc: Doc, datos: DatosNotaPdf, pagina: number, total: number) {
  doc.lineWidth(0.5).strokeColor(LINEA).moveTo(MARGEN, PIE).lineTo(MARGEN + UTIL, PIE).stroke()
  doc.fillColor(GRIS).font('Helvetica').fontSize(9)
    .text(`${datos.codigo} · Nota de venta sin valor fiscal · Gracias por comprar en AML AgroTech`, MARGEN, PIE + 8, { width: UTIL - 80, lineBreak: false })
    .text(`Página ${pagina} de ${total}`, MARGEN + UTIL - 80, PIE + 8, { width: 80, align: 'right', lineBreak: false })
}

export async function generarNotaPdf(datos: DatosNotaPdf): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGEN,
    bufferPages: true,
    info: { Title: `Nota de venta ${datos.codigo}`, Author: 'AML AgroTech', Subject: 'Nota de venta — documento sin valor fiscal' },
  })
  const partes: Buffer[] = []
  doc.on('data', (parte: Buffer) => partes.push(parte))
  const terminado = new Promise<Buffer>((resolver, rechazar) => {
    doc.on('end', () => resolver(Buffer.concat(partes)))
    doc.on('error', rechazar)
  })

  let y = encabezado(doc, datos)

  // Cliente y entrega lado a lado; debajo, pago y estado
  const mitad = (UTIL - 24) / 2
  const cliente = [datos.cliente?.nombre ?? 'Cliente', `Teléfono: ${datos.telefono_contacto ?? datos.cliente?.telefono ?? '—'}`]
  const finCliente = bloque(doc, 'Cliente', cliente, MARGEN, y, mitad)
  const finEntrega = bloque(doc, 'Entrega', lineasEntrega(datos), MARGEN + mitad + 24, y, mitad)
  y = Math.max(finCliente, finEntrega) + 10

  const estadoPedido = datos.anulada ? 'Cancelado (nota anulada)' : INFO_ESTADO_PEDIDO[datos.estado].etiqueta
  const pago = [
    `Método: ${ETIQUETA_METODO[datos.metodo_pago]}`,
    `Estado del pago: ${textoPago(datos)}`,
  ]
  const finPago = bloque(doc, 'Pago', pago, MARGEN, y, mitad)
  const finEstado = bloque(doc, 'Estado del pedido', [estadoPedido], MARGEN + mitad + 24, y, mitad)
  y = Math.max(finPago, finEstado) + 18

  y = tabla(doc, datos, y)
  await totalesYQr(doc, datos, y)

  // Marca de agua y pie en cada página (bufferPages permite volver a cada una)
  const { start, count } = doc.bufferedPageRange()
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i)
    if (datos.anulada) marcaAnulada(doc)
    pie(doc, datos, i - start + 1, count)
  }

  doc.end()
  return terminado
}
