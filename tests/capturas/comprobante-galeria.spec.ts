import type { Page } from '@playwright/test'
import { entrarComoCliente, expect, test } from '../e2e/utilidades'

// Capturas de la fase 5: el selector del comprobante (cámara, galería, PDF) a 412 y 360 px.
// NO toca la base: toma un pedido viejo del cliente fijo de prueba y, solo en el navegador,
// lo muestra como pendiente de pago por QR. Subir el comprobante queda bloqueado.
//   CAPTURAS_SPEC=comprobante-galeria.spec.ts E2E_BASE_URL=http://localhost:3210 npx playwright test --config tests/capturas/playwright.capturas.ts
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [412, 360]

async function capturar(page: Page, nombre: string) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.waitForTimeout(400)
    const medida = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`${nombre} ${ancho} px → página de ${medida} px${medida > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
    expect(medida, `${nombre} a ${ancho} px`).toBeLessThanOrEqual(ancho)
    await page.locator('section', { hasText: 'Envíanos tu comprobante' }).last().screenshot({ path: `${SALIDA}/fase5-${nombre}-${ancho}.png` })
  }
}

// Pone un archivo en el input como si el cliente lo eligiera en el celular
async function elegirArchivo(page: Page, etiqueta: string, archivo: { nombre: string; tipo: string; foto: boolean }) {
  await page.getByLabel(etiqueta).evaluate(async (entrada: HTMLInputElement, a) => {
    let blob: Blob
    if (a.foto) {
      // Una "foto de galería" de 4000 x 3000 con ruido: pesa varios MB
      const lienzo = document.createElement('canvas')
      lienzo.width = 4000
      lienzo.height = 3000
      const ctx = lienzo.getContext('2d')!
      const datos = ctx.createImageData(4000, 3000)
      for (let i = 0; i < datos.data.length; i++) datos.data[i] = (i * 2654435761) % 256
      ctx.putImageData(datos, 0, 0)
      ctx.fillStyle = '#15753a'
      ctx.font = 'bold 260px sans-serif'
      ctx.fillText('Comprobante', 600, 1600)
      blob = await new Promise<Blob>((r) => lienzo.toBlob((b) => r(b!), 'image/jpeg', 0.95))
    } else {
      blob = new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])], { type: a.tipo })
    }
    console.log(`archivo elegido: ${a.nombre} ${(blob.size / 1024 / 1024).toFixed(1)} MB`)
    const transferencia = new DataTransfer()
    transferencia.items.add(new File([blob], a.nombre, { type: a.tipo }))
    entrada.files = transferencia.files
    entrada.dispatchEvent(new Event('change', { bubbles: true }))
  }, archivo)
}

test('selector del comprobante a 412 y 360 px', async ({ page }) => {
  page.on('console', (m) => { if (m.text().startsWith('archivo')) console.log(m.text()) })
  await entrarComoCliente(page, '/pedidos')

  // Un pedido viejo del cliente fijo, mostrado como pendiente de pago por QR (solo en el navegador)
  const lista = await page.evaluate(async () => (await (await fetch('/api/pedidos')).json()).data as { id: string }[])
  expect(lista.length, 'el cliente fijo tiene pedidos viejos').toBeGreaterThan(0)
  const id = lista[0].id
  const real = await page.evaluate(async (i) => (await (await fetch(`/api/pedidos/${i}`)).json()).data, id)
  const simulado = {
    ...real,
    estado: 'pendiente',
    estado_pago: 'pendiente',
    metodo_pago: 'qr',
    pagos: { ...real.pagos, metodo: 'qr', estado: 'pendiente', comprobante_path: null, motivo_rechazo: null },
  }
  await page.route(`**/api/pedidos/${id}`, (ruta) =>
    ruta.request().method() === 'GET' ? ruta.fulfill({ json: { data: simulado } }) : ruta.abort())
  await page.route('**/api/pagos/**', (ruta) => ruta.abort())

  await page.goto(`/pedidos/${id}`)
  await expect(page.getByText('Envíanos tu comprobante')).toBeVisible()

  // La galería no lleva "capture": el celular ofrece Galería/Fotos además de la cámara
  const galeria = page.getByLabel('Elegir foto del comprobante de la galería')
  await expect(galeria).toHaveAttribute('accept', 'image/*')
  expect(await galeria.getAttribute('capture')).toBeNull()
  await expect(page.getByLabel('Sacar foto del comprobante con la cámara')).toHaveAttribute('capture', 'environment')
  await expect(page.getByLabel('Subir comprobante en PDF')).toHaveAttribute('accept', 'application/pdf')
  await capturar(page, '1-selector')

  // Foto pesada de la galería → se achica a JPG y se ve la vista previa
  await elegirArchivo(page, 'Elegir foto del comprobante de la galería', { nombre: 'IMG_20261114.jpg', tipo: 'image/jpeg', foto: true })
  const vista = page.getByRole('img', { name: 'Vista previa del comprobante' })
  await expect(vista).toBeVisible()
  const tamano = await vista.evaluate(async (img: HTMLImageElement) => {
    const b = await (await fetch(img.src)).blob()
    return { kb: Math.round(b.size / 1024), tipo: b.type, ancho: img.naturalWidth, alto: img.naturalHeight }
  })
  console.log(`foto preparada: ${tamano.ancho}x${tamano.alto} ${tamano.tipo} ${tamano.kb} KB`)
  expect(Math.max(tamano.ancho, tamano.alto)).toBeLessThanOrEqual(1280)
  expect(tamano.tipo).toBe('image/jpeg')
  await capturar(page, '2-vista-previa')

  // HEIC que el navegador no puede leer → mensaje claro
  await page.getByRole('button', { name: /Elegir otra foto/ }).click()
  await elegirArchivo(page, 'Elegir foto del comprobante de la galería', { nombre: 'IMG_0042.HEIC', tipo: 'image/heic', foto: false })
  await expect(page.getByText(/formato HEIC/)).toBeVisible()
  await capturar(page, '3-heic')
})
