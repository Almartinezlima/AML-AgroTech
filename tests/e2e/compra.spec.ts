import { PRODUCTO_A, PRODUCTO_B, abrirCheckout, agregarAlCarrito, entrarComoCliente, expect, finalizarCompra, test } from './utilidades'

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

    // En provincia no se ofrece contra entrega
    await abrirCheckout(page)
    await page.getByRole('radio', { name: /Culpina/ }).check()
    // Por flota se pide quién recoge, no una dirección. Se vacían los datos recordados para probar los avisos.
    await expect(page.getByLabel(/Dirección/)).toHaveCount(0)
    await page.getByLabel('Nombre de quien recoge').fill('')
    await page.getByLabel('CI de quien recoge').fill('')
    await page.getByRole('button', { name: 'Elegir cómo pagar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'nombre de quien recoge' })).toBeVisible()
    await page.getByLabel('Nombre de quien recoge').fill('Juan Mamani E2E')
    await page.getByLabel('CI de quien recoge').fill('12')
    await page.getByRole('button', { name: 'Elegir cómo pagar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'CI válido' })).toBeVisible()
    await page.getByLabel('CI de quien recoge').fill('1234567')
    await page.getByLabel('Teléfono / WhatsApp').fill('70012345')
    await page.getByRole('button', { name: 'Elegir cómo pagar' }).click()
    await expect(page.getByRole('radio', { name: /QR/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: /Contra entrega/ })).toHaveCount(0)
    await expect(page.getByText('El pago contra entrega no está disponible para envíos a Culpina.')).toBeVisible()

    // El pedido se anula solo al terminar la prueba (fixture `limpieza`)
    const pedido = await finalizarCompra(page, { zona: 'Culpina', metodo: 'QR', recogeNombre: 'Juan Mamani E2E', recogeCi: '1234567' })
    expect(pedido.envio).toBe(ENVIO_CULPINA)
    expect(pedido.total).toBeCloseTo(pedido.subtotal + ENVIO_CULPINA, 2)
    expect(pedido.codigo).toMatch(/^AML-/)

    // El pedido aparece en Mis pedidos, con quién recoge en el detalle, y el carrito quedó vacío
    await page.goto('/pedidos')
    await expect(page.getByText(pedido.codigo)).toBeVisible()
    await page.goto(`/pedidos/${pedido.id}`)
    await expect(page.getByText(/Juan Mamani E2E/)).toBeVisible()
    await page.goto('/carrito')
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()

    // En la siguiente compra el checkout recuerda la zona y quién recoge
    await agregarAlCarrito(page, PRODUCTO_A)
    await abrirCheckout(page)
    await expect(page.getByText('Usamos los datos de tu última compra')).toBeVisible()
    await expect(page.getByRole('radio', { name: /Culpina/ })).toBeChecked()
    await expect(page.getByLabel('Nombre de quien recoge')).toHaveValue('Juan Mamani E2E')
    await expect(page.getByLabel('CI de quien recoge')).toHaveValue('1234567')
  })
})
