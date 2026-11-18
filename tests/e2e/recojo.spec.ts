import {
  PRODUCTO_A, agregarAlCarrito, entrarComoCliente, esperarCarga, expect, finalizarCompra,
  imagenComprobante, paginaAdmin, test,
} from './utilidades'

// Fase 9G: recojo en tienda. El cliente ve «Tu pedido está listo. Ve a la tienda y dicta este
// código» sin recargar; el admin entrega con el código y el nombre ya escrito.
test.describe('Recojo en tienda', () => {
  test('listo → el cliente ve el aviso y su código sin recargar → el admin entrega con el código', async ({ page, browser }) => {
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Recojo en tienda' })
    await page.getByLabel('Elegir la foto del pago de la galería').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('heading', { name: '¡Recibimos tu comprobante!' })).toBeVisible()

    // El cliente deja abierto su pedido
    await page.goto(`/pedidos/${pedido.id}`)
    await esperarCarga(page)

    const admin = await paginaAdmin(browser)
    try {
      const conPago = (await (await admin.request.get(`/api/pedidos/${pedido.id}`)).json()) as { data: { pagos: { id: string } } }
      expect((await admin.request.patch(`/api/pagos/${conPago.data.pagos.id}/verificar`, { data: { aprobado: true } })).ok()).toBeTruthy()

      // «Empezar a preparar» en la lista empieza y abre el detalle
      await admin.goto('/admin/preparar')
      await esperarCarga(admin)
      await admin.getByRole('article').filter({ hasText: pedido.codigo }).getByRole('button', { name: 'Empezar a preparar' }).click()
      await expect(admin).toHaveURL(new RegExp(`/admin/preparar/pedidos/${pedido.id}`))
      await esperarCarga(admin)
      for (const casilla of await admin.getByRole('checkbox').all()) {
        await casilla.click()
        await expect(casilla).toHaveAttribute('aria-checked', 'true')
      }
      await admin.getByRole('button', { name: 'Listo para salir' }).click()
      await admin.getByRole('dialog').getByRole('button', { name: 'Listo para salir' }).click()
      await expect(admin.getByText('Espera al cliente en la tienda.')).toBeVisible()

      // Sin recargar (cada 10 s), el cliente ve el aviso de recojo con su código
      await expect(page.getByText('Tu pedido está listo. Ve a la tienda y dicta este código:')).toBeVisible({ timeout: 15_000 })
      const codigo = (await page.getByRole('region', { name: 'Código de entrega' }).getByText(/^[0-9]{4}$/).innerText()).trim()

      // El admin entrega en tienda: el nombre viene con el del cliente (editable)
      const nombre = admin.getByLabel('Nombre de quien recoge')
      await expect(nombre).not.toHaveValue('')
      await admin.getByLabel('Código del cliente').fill(codigo)
      await admin.getByLabel('CI de quien recoge').fill('1234567')
      await admin.getByRole('button', { name: 'Entregar en tienda' }).click()
      await expect(admin.getByText('Entregado · registrado con tu nombre y hora.')).toBeVisible()
      await expect(admin.getByText('ya no está por entregar')).toHaveCount(0)

      // Y el cliente lo ve completado sin recargar
      await expect(page.getByText('Completado', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    } finally {
      await admin.context().close()
    }
  })
})
