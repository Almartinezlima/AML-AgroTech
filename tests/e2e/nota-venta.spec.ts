import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { inflateSync } from 'node:zlib'
import { request as solicitudes, type APIResponse, type Page } from '@playwright/test'
import {
  PRODUCTO_A, agregarAlCarrito, datosDePruebaEnPanel, entrarComoCliente, esperarCarga, expect, finalizarCompra,
  imagenComprobante, limpiarDatosDePrueba, paginaAdmin, paginaDistribuidor, test,
} from './utilidades'

// Fase 7: nota de venta en PDF. Los PDF de ejemplo y las capturas quedan en test-results/notas/.
const CARPETA = path.join(process.cwd(), 'test-results', 'notas')

function guardar(nombre: string, contenido: Buffer) {
  mkdirSync(CARPETA, { recursive: true })
  writeFileSync(path.join(CARPETA, nombre), contenido)
}

// Texto del PDF: pdfkit comprime cada página (deflate) y escribe el texto en hexadecimal
function textoDelPdf(pdf: Buffer): string {
  const binario = pdf.toString('latin1')
  let texto = ''
  for (const bloque of Array.from(binario.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g))) {
    try {
      texto += inflateSync(Buffer.from(bloque[1], 'latin1')).toString('latin1')
    } catch {
      // Imágenes u otros flujos que no son texto
    }
  }
  // Cada [<414e55> 20 <4c…>] TJ es una línea: se juntan sus trozos (los números son el kerning)
  const lineas: string[] = []
  for (const arreglo of Array.from(texto.matchAll(/\[([^\]]*)\]\s*TJ/g))) {
    lineas.push(Array.from(arreglo[1].matchAll(/<([0-9a-f]*)>/gi), (h: RegExpMatchArray) => Buffer.from(h[1], 'hex').toString('latin1')).join(''))
  }
  return lineas.join('\n')
}

async function esPdf(respuesta: APIResponse) {
  expect(respuesta.status()).toBe(200)
  expect(respuesta.headers()['content-type']).toContain('application/pdf')
  const cuerpo = await respuesta.body()
  expect(cuerpo.subarray(0, 5).toString()).toBe('%PDF-')
  return cuerpo
}

// Descarga tocando el botón, como una persona
async function descargarConBoton(pagina: Page, nombre: RegExp, archivo: string) {
  const descarga = pagina.waitForEvent('download')
  await pagina.getByRole('link', { name: nombre }).first().click()
  const hecha = await descarga
  const destino = path.join(CARPETA, archivo)
  mkdirSync(CARPETA, { recursive: true })
  await hecha.saveAs(destino)
  const pdf = readFileSync(destino)
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  return { pdf, sugerido: hecha.suggestedFilename() }
}

async function capturar(pagina: Page, ancho: number, archivo: string, objetivo: string) {
  await pagina.setViewportSize({ width: ancho, height: ancho === 360 ? 800 : 900 })
  await pagina.getByRole('link', { name: new RegExp(objetivo) }).first().evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // Sin scroll horizontal en ningún ancho
  const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(desborde).toBeLessThanOrEqual(0)
  await pagina.screenshot({ path: path.join(CARPETA, archivo) })
}

test.describe('Nota de venta', () => {
  test('contra entrega: pendiente sin nota (409) → confirmado → la descargan el cliente y el admin', async ({ page, browser }) => {
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Distrito 1', metodo: 'Contra entrega' })

    // Pendiente: todavía no hay venta
    const pendiente = await page.request.get(`/api/pedidos/${pedido.id}/nota`)
    expect(pendiente.status()).toBe(409)
    expect(((await pendiente.json()) as { error: { codigo: string } }).error.codigo).toBe('NOTA_NO_DISPONIBLE')
    await page.goto(`/pedidos/${pedido.id}`)
    await esperarCarga(page)
    await expect(page.getByText('La nota de venta estará disponible cuando la tienda confirme tu pedido.')).toBeVisible()
    await expect(page.getByRole('link', { name: /Descargar nota de venta/ })).toHaveCount(0)

    // El admin confirma
    const admin = await paginaAdmin(browser)
    const confirmar = await admin.request.patch(`/api/pedidos/${pedido.id}/estado`, { data: { estado: 'confirmado', nota: 'E2E: confirmado' } })
    expect(confirmar.ok()).toBeTruthy()

    // Cliente: botón en el detalle
    await page.reload()
    await esperarCarga(page)
    const cliente = await descargarConBoton(page, /Descargar nota de venta/, 'nota-contra-entrega.pdf')
    expect(cliente.sugerido).toBe(`Nota-${pedido.codigo}.pdf`)
    const texto = textoDelPdf(cliente.pdf)
    expect(texto).toContain(pedido.codigo)
    expect(texto).toContain('sin valor fiscal')
    expect(texto).toContain('Se paga al recibir')
    expect(texto).not.toContain('ANULADA')
    await capturar(page, 360, 'cliente-360.png', 'Descargar nota de venta')
    await capturar(page, 1280, 'cliente-1280.png', 'Descargar nota de venta')

    // Admin: "Nota PDF" en la tarjeta del panel
    await admin.goto('/admin/pedidos')
    await datosDePruebaEnPanel(admin, true)
    const tarjeta = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await expect(tarjeta.getByRole('link', { name: /Nota PDF/ })).toBeVisible()
    const descarga = admin.waitForEvent('download')
    await tarjeta.getByRole('link', { name: /Nota PDF/ }).click()
    const delAdmin = await descarga
    expect(delAdmin.suggestedFilename()).toBe(`Nota-${pedido.codigo}.pdf`)
    await capturar(admin, 360, 'admin-360.png', 'Nota PDF')
    await capturar(admin, 1280, 'admin-1280.png', 'Nota PDF')
    await admin.context().close()
  })

  test('QR verificado: nota del cliente; ajeno o inventado 404, sin sesión 401; al anularse sale ANULADA', async ({ page, browser }) => {
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Distrito 1', metodo: 'QR' })

    // Comprobante (en revisión todavía no hay nota) y el admin aprueba el pago
    await page.goto(`/pedidos/${pedido.id}`)
    await page.getByLabel('Elegir foto del comprobante de la galería').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar comprobante' }).click()
    await expect(page.getByText('En revisión')).toBeVisible()
    expect((await page.request.get(`/api/pedidos/${pedido.id}/nota`)).status()).toBe(409)

    const admin = await paginaAdmin(browser)
    const detalle = (await (await admin.request.get(`/api/pedidos/${pedido.id}`)).json()) as { data: { pagos: { id: string } } }
    const aprobar = await admin.request.patch(`/api/pagos/${detalle.data.pagos.id}/verificar`, { data: { aprobado: true } })
    expect(aprobar.ok()).toBeTruthy()
    // El admin también la descarga por la API
    await esPdf(await admin.request.get(`/api/pedidos/${pedido.id}/nota`))
    await admin.context().close()

    const pdfQr = await esPdf(await page.request.get(`/api/pedidos/${pedido.id}/nota`))
    expect(textoDelPdf(pdfQr)).toContain('Pago verificado')
    guardar('nota-qr-verificado.pdf', pdfQr)

    // Inventado → 404; sin sesión → 401
    expect((await page.request.get('/api/pedidos/00000000-0000-4000-8000-000000000000/nota')).status()).toBe(404)
    const anonimo = await solicitudes.newContext({ baseURL: test.info().project.use.baseURL })
    expect((await anonimo.get(`/api/pedidos/${pedido.id}/nota`)).status()).toBe(401)
    await anonimo.dispose()

    // Ajeno: otra cuenta (el distribuidor de prueba) no puede bajar la nota del cliente
    const otro = await paginaDistribuidor(browser, 1)
    expect((await otro.request.get(`/api/pedidos/${pedido.id}/nota`)).status()).toBe(404)
    await otro.context().close()

    // La limpieza lo anula (se había confirmado): la nota sigue disponible, marcada ANULADA
    await limpiarDatosDePrueba(browser)
    await page.reload()
    await esperarCarga(page)
    await expect(page.getByText('la nota sale marcada como ANULADA')).toBeVisible()
    const anulada = await descargarConBoton(page, /Descargar nota de venta/, 'nota-anulada.pdf')
    const texto = textoDelPdf(anulada.pdf)
    expect(texto).toContain('ANULADA')
    expect(texto).toContain(pedido.codigo)
  })
})
