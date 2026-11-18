import { PRODUCTO_A, PRODUCTO_B, abrirCheckout, agregarAlCarrito, botonConfirmar, entrarComoCliente, expect, finalizarCompra, test } from './utilidades'

// Costo de Culpina por flota desde la migración 0010
const ENVIO_CULPINA = 25

test.describe('Compra completa', () => {
  test('armar el carrito y pedir a Culpina', async ({ page }) => {
    await entrarComoCliente(page)

    await agregarAlCarrito(page, PRODUCTO_A)
    await agregarAlCarrito(page, PRODUCTO_B)

    // El carrito sobrevive a una recarga
    await page.goto('/carrito')
    await expect(page.getByText('2 productos agregados')).toBeVisible()
    await page.reload()
    await expect(page.getByText('2 productos agregados')).toBeVisible()
    await expect(page.getByText(PRODUCTO_A)).toBeVisible()
    await expect(page.getByText(PRODUCTO_B)).toBeVisible()

    // El carrito muestra los pasos y "Ir a pagar" lleva al checkout
    await expect(page.getByRole('navigation', { name: 'Pasos de la compra' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Seguir comprando' })).toHaveAttribute('href', '/catalogo')
    await expect(page.getByRole('link', { name: /Ir a pagar/ })).toHaveAttribute('href', '/checkout')

    // Una sola pantalla (fase 9E): zona y datos. Fase 9F: solo QR, sin «¿Cómo quieres pagar?»
    await abrirCheckout(page)
    await expect(page.getByRole('heading', { name: 'Pagas con QR' })).toBeVisible()
    await expect(page.getByText('¿Cómo quieres pagar?')).toHaveCount(0)
    await expect(page.getByRole('radio', { name: /Efectivo al recibir|Transferencia/ })).toHaveCount(0)
    await page.getByRole('radio', { name: /Culpina/ }).check()

    // Por flota se pide quién recoge, no una dirección. Se vacían los datos recordados para probar los errores.
    await expect(page.getByLabel(/Dirección/)).toHaveCount(0)
    const nombre = page.getByLabel('Nombre de quien recoge')
    const ci = page.getByLabel('CI de quien recoge')
    await nombre.fill('')
    await ci.fill('')
    await botonConfirmar(page).click()
    // El error va debajo del campo (borde rojo y aria-invalid), nunca arriba, y el foco va al primero
    await expect(page.locator('#recoge-nombre-error')).toContainText('nombre de quien recoge')
    await expect(nombre).toHaveAttribute('aria-invalid', 'true')
    await expect(nombre).toBeFocused()
    await expect(page.locator('#recoge-ci-error')).toContainText('CI válido')
    await expect(page).toHaveURL(/\/checkout$/)

    // Al escribir, el error de ese campo se va
    await nombre.fill('Juan Mamani E2E')
    await expect(page.locator('#recoge-nombre-error')).toHaveCount(0)
    await ci.fill('12')
    await botonConfirmar(page).click()
    await expect(page.locator('#recoge-ci-error')).toContainText('CI válido')
    await expect(ci).toBeFocused()
    await ci.fill('1234567')
    await page.getByLabel('Teléfono / WhatsApp').fill('70012345')

    // El pedido se anula solo al terminar la prueba (fixture `limpieza`)
    const pedido = await finalizarCompra(page, { zona: 'Culpina', recogeNombre: 'Juan Mamani E2E', recogeCi: '1234567' })
    expect(pedido.envio).toBe(ENVIO_CULPINA)
    expect(pedido.total).toBeCloseTo(pedido.subtotal + ENVIO_CULPINA, 2)
    expect(pedido.codigo).toMatch(/^AML-/)

    // Al confirmar, el carrito queda vacío: en el menú, tras recargar y al volver con Atrás
    const contadorCarrito = page.locator('a[aria-label^="Carrito,"]:visible')
    await expect(contadorCarrito).toHaveAttribute('aria-label', 'Carrito, 0 productos')
    await page.reload()
    // Clic 3: el QR con el monto y la subida de la foto del pago justo debajo (sin «Ya pagué»)
    await expect(page.getByRole('heading', { name: /^Paga Bs\./ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '2. Sube la foto del pago' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ya pagué/ })).toHaveCount(0)
    await expect(contadorCarrito).toHaveAttribute('aria-label', 'Carrito, 0 productos')
    await page.goBack()
    await expect(page).not.toHaveURL(/\/checkout\/exito/)
    await expect(contadorCarrito).toHaveAttribute('aria-label', 'Carrito, 0 productos')
    // Se entra con el enlace del menú (sin recargar): es la misma página que el navegador restauró
    await contadorCarrito.click()
    await expect(page).toHaveURL(/\/carrito$/)
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()

    // Desde la pantalla del pago se puede pagar después: lleva al pedido
    await page.goto(`/checkout/exito?id=${pedido.id}`)
    await page.getByRole('link', { name: /Pagar después/ }).click()
    await expect(page).toHaveURL(new RegExp(`/pedidos/${pedido.id}$`))

    // El pedido aparece en Mis pedidos, con quién recoge en el detalle
    await page.goto('/pedidos')
    await expect(page.getByText(pedido.codigo)).toBeVisible()
    await page.goto(`/pedidos/${pedido.id}`)
    await expect(page.getByText(/Juan Mamani E2E/)).toBeVisible()

    // En la siguiente compra el checkout recuerda la zona y quién recoge
    await agregarAlCarrito(page, PRODUCTO_A)
    await abrirCheckout(page)
    await expect(page.getByText('Usamos los datos de tu última compra')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Culpina/ })).toBeChecked()
    await expect(page.getByLabel('Nombre de quien recoge')).toHaveValue('Juan Mamani E2E')
    await expect(page.getByLabel('CI de quien recoge')).toHaveValue('1234567')
  })
})
