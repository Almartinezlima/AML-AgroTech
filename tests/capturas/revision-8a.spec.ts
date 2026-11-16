import type { Page } from '@playwright/test'
import { PRODUCTO_A, agregarAlCarrito, entrarComoCliente, esperarCarga, expect, finalizarCompra, paginaAdmin, paginaDistribuidor, test } from '../e2e/utilidades'

// Capturas de la fase 8A (revisión): /distribuidor, /admin/abastecimiento y la pantalla de pago
// con el QR real, a 1280 y 360 px, midiendo el scroll horizontal. Se corre a mano con
//   CAPTURAS_SPEC=revision-8a.spec.ts E2E_BASE_URL=http://localhost:3210 npx playwright test --config tests/capturas/playwright.capturas.ts
// Crea UN pedido con el cliente fijo de prueba y la limpieza de las E2E lo anula al terminar.
// Usa solo las cuentas fijas de prueba; no crea ni cambia cuentas.
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [1280, 360]

async function capturar(page: Page, nombre: string) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.waitForTimeout(500)
    await esperarCarga(page)
    const medida = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`${nombre} ${ancho} px → página de ${medida} px${medida > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
    expect(medida, `${nombre} a ${ancho} px`).toBeLessThanOrEqual(ancho)
    await page.screenshot({ path: `${SALIDA}/fase8a-${nombre}-${ancho}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1280, height: 860 })
}

test('capturas de la revisión 8A', async ({ page, browser }) => {
  const dist = await paginaDistribuidor(browser, 1)
  await expect(dist.getByRole('region', { name: 'Cómo usar esta pantalla' })).toBeVisible()
  await expect(dist.getByRole('heading', { name: 'Mis presentaciones' })).toBeVisible()
  await capturar(dist, 'distribuidor')
  await dist.context().close()

  const admin = await paginaAdmin(browser)
  await admin.goto('/admin/abastecimiento')
  await expect(admin.getByRole('region', { name: 'Cómo usar esta pantalla' })).toBeVisible()
  await expect(admin.getByRole('heading', { name: 'Órdenes de compra' })).toBeVisible()
  await capturar(admin, 'abastecimiento')
  await admin.context().close()

  await entrarComoCliente(page)
  await agregarAlCarrito(page, PRODUCTO_A)
  await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR', recogeNombre: 'Recoge Captura', recogeCi: '1234567' })
  const qr = page.getByRole('img', { name: /QR para pagar/ })
  await expect(qr).toBeVisible()
  await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText(/demostración/)).toHaveCount(0)
  await capturar(page, 'pago-qr')
})
