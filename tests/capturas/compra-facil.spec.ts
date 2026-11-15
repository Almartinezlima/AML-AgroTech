import type { Page } from '@playwright/test'
import { PRODUCTO_A, PRODUCTO_B, abrirCheckout, agregarAlCarrito, anotarPedido, entrarComoCliente, expect, test } from '../e2e/utilidades'

// Capturas de la fase 4 (compra fácil): carrito, Datos y envío, Pago, Listo con QR, Mis pedidos
// y detalle, a 1280, 412 y 360 px, midiendo el scroll horizontal. Se corre a mano con
//   CAPTURAS_SPEC=compra-facil.spec.ts E2E_BASE_URL=http://localhost:3210 npx playwright test --config tests/capturas/playwright.capturas.ts
// Crea UN pedido con el cliente fijo de prueba y la limpieza de las E2E lo anula al terminar
// (cancelado, stock devuelto). Nunca con cuentas reales.
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [1280, 412, 360]

async function capturar(page: Page, nombre: string) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.waitForTimeout(400)
    await expect(page.getByRole('status', { name: 'Cargando' })).toHaveCount(0)
    const medida = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`${nombre} ${ancho} px → página de ${medida} px${medida > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
    expect(medida, `${nombre} a ${ancho} px`).toBeLessThanOrEqual(ancho)
    await page.screenshot({ path: `${SALIDA}/fase4-${nombre}-${ancho}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1280, height: 860 })
}

test('capturas de la compra fácil', async ({ page }) => {
  await entrarComoCliente(page)
  await agregarAlCarrito(page, PRODUCTO_A)
  await agregarAlCarrito(page, PRODUCTO_B)

  await page.goto('/carrito')
  await expect(page.getByRole('link', { name: /Ir a pagar/ })).toBeVisible()
  await capturar(page, '1-carrito')

  // Datos y envío, con lo recordado de la última compra (se completa lo que falte)
  await abrirCheckout(page)
  await page.getByRole('radio', { name: /Culpina/ }).check()
  const nombre = page.getByLabel('Nombre de quien recoge')
  if (!(await nombre.inputValue())) await nombre.fill('Recoge Captura')
  const ci = page.getByLabel('CI de quien recoge')
  if (!(await ci.inputValue())) await ci.fill('1234567')
  const telefono = page.getByLabel('Teléfono / WhatsApp')
  if (!(await telefono.inputValue())) await telefono.fill('70012345')
  await capturar(page, '2-datos-y-envio')

  await page.getByRole('button', { name: 'Elegir cómo pagar' }).click()
  await page.getByRole('radio', { name: /QR/ }).check()
  await expect(page.getByRole('button', { name: /Confirmar pedido/ })).toBeVisible()
  await capturar(page, '3-pago')

  // Listo: el pedido de prueba queda anotado para anularse al terminar
  await page.getByRole('button', { name: /Confirmar pedido/ }).click()
  await expect(page).toHaveURL(/\/checkout\/exito\?id=/)
  const id = new URL(page.url()).searchParams.get('id')!
  anotarPedido(id)
  await expect(page.getByRole('img', { name: /QR para pagar/ })).toBeVisible()
  await capturar(page, '4-listo-qr')

  await page.goto('/pedidos')
  await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible()
  await capturar(page, '5-mis-pedidos')

  await page.goto(`/pedidos/${id}`)
  await expect(page.getByText('Qué sigue:')).toBeVisible()
  await capturar(page, '6-detalle')
})
