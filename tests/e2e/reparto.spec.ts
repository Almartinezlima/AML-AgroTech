import type { Page } from '@playwright/test'
import {
  PRODUCTO_A, agregarAlCarrito, entrarComoCliente, esperarCarga, exigirRepartidor, expect, finalizarCompra,
  imagenComprobante, paginaAdmin, paginaRepartidor, test,
} from './utilidades'

// Fase 9F (migración 0020): flujo final a domicilio con repartidor externo.
// No paga al repartidor ni deja filas nuevas fuera del pedido: la limpieza anula el pedido de
// prueba y el repartidor vuelve a «No disponible» al terminar.

const DIRECCION = 'E2E — Calle Reparto 9F'

// El interruptor grande de disponibilidad: lo deja como se pide
async function ponerDisponible(repartidor: Page, disponible: boolean) {
  const interruptor = repartidor.getByRole('switch')
  await expect(interruptor).toBeVisible()
  if ((await interruptor.getAttribute('aria-checked')) !== String(disponible)) {
    await interruptor.click()
    await expect(interruptor).toHaveAttribute('aria-checked', String(disponible))
  }
}

const tarjetaDisponible = (repartidor: Page) =>
  repartidor.getByRole('article').filter({ hasText: DIRECCION }).filter({ has: repartidor.getByRole('button', { name: 'Aceptar' }) })

test.describe('Reparto con repartidor externo', () => {
  test('el admin deja listo para salir, el repartidor acepta, recoge y entrega con el código; ganado y por cobrar', async ({ page, browser }) => {
    exigirRepartidor()

    // Cliente: compra a domicilio (solo QR) y sube la foto del pago
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Distrito 1', direccion: DIRECCION })
    await page.getByLabel('Elegir la foto del pago de la galería').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('heading', { name: '¡Recibimos tu comprobante!' })).toBeVisible()

    // El cliente no entra al panel ni a la API del repartidor
    expect((await page.request.get('/api/repartidor/panel')).status()).toBe(403)
    expect((await page.request.post(`/api/entregas/${pedido.id}/aceptar`)).status()).toBe(403)

    // El cliente deja abierto su pedido: se actualiza solo (fase 9G)
    await page.goto(`/pedidos/${pedido.id}`)
    await esperarCarga(page)

    // Admin: aprueba el pago, prepara y deja «Listo para salir» (ya no hay rol almacén)
    const admin = await paginaAdmin(browser)
    const conPago = (await (await admin.request.get(`/api/pedidos/${pedido.id}`)).json()) as { data: { pagos: { id: string } } }
    expect((await admin.request.patch(`/api/pagos/${conPago.data.pagos.id}/verificar`, { data: { aprobado: true } })).ok()).toBeTruthy()

    // Fase 9G: el más nuevo arriba y «Empezar a preparar» en la lista abre el detalle
    await admin.goto('/admin/preparar')
    await esperarCarga(admin)
    await expect(admin.getByRole('article').first()).toContainText(pedido.codigo)
    await admin.getByRole('article').filter({ hasText: pedido.codigo }).getByRole('button', { name: 'Empezar a preparar' }).click()
    await expect(admin).toHaveURL(new RegExp(`/admin/preparar/pedidos/${pedido.id}`))
    await esperarCarga(admin)
    for (const casilla of await admin.getByRole('checkbox').all()) {
      await casilla.click()
      await expect(casilla).toHaveAttribute('aria-checked', 'true')
    }
    await admin.getByRole('button', { name: 'Listo para salir' }).click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Listo para salir' }).click()
    await expect(admin.getByText('Se avisó al grupo de repartidores.')).toBeVisible()
    // Sin recargar, el cliente ya ve «Listo para salir» y su código (cada 10 s)
    await expect(page.getByText('Listo para salir').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('region', { name: 'Código de entrega' })).toBeVisible()
    // El admin no usa el panel del repartidor: va a /admin/repartidores
    await admin.goto('/repartidor')
    await expect(admin).toHaveURL(/\/admin\/repartidores/)

    // Repartidor: sin estar disponible no ve entregas
    const repartidor = await paginaRepartidor(browser)
    try {
      await ponerDisponible(repartidor, false)
      await expect(repartidor.getByText('Marca «Estoy disponible» para ver las entregas')).toBeVisible()

      // Disponible: la ve con zona, dirección, bultos y lo que gana, sin datos del cliente
      await ponerDisponible(repartidor, true)
      const tarjeta = tarjetaDisponible(repartidor)
      await expect(tarjeta).toBeVisible()
      await expect(tarjeta).toContainText(/Ganas Bs\. \d/)
      await expect(tarjeta).toContainText('bulto')
      await expect(tarjeta.getByRole('link', { name: 'Llamar' })).toHaveCount(0)

      // Aceptar: pasa a «Mis entregas» y deja de estar disponible
      await tarjeta.getByRole('button', { name: 'Aceptar' }).click()
      await repartidor.getByRole('dialog').getByRole('button', { name: 'Sí, la acepto' }).click()
      const mia = repartidor.getByRole('article').filter({ hasText: pedido.codigo })
      await expect(mia).toBeVisible()
      await expect(tarjetaDisponible(repartidor)).toHaveCount(0)

      // El admin la ve aceptada y la libera (el repartidor no apareció): vuelve a estar disponible
      await admin.goto('/admin/repartidores')
      await esperarCarga(admin)
      const enCurso = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
      await expect(enCurso).toContainText('Aceptada')
      await enCurso.getByRole('button', { name: 'Liberar entrega' }).click()
      await admin.getByRole('dialog').getByRole('button', { name: 'Sí, liberar' }).click()
      await expect(enCurso).toContainText('Esperando repartidor')

      // La vuelve a aceptar, la recoge en la tienda y sale
      await repartidor.reload()
      await tarjetaDisponible(repartidor).getByRole('button', { name: 'Aceptar' }).click()
      await repartidor.getByRole('dialog').getByRole('button', { name: 'Sí, la acepto' }).click()
      await mia.getByRole('button', { name: 'Recogí el pedido' }).click()
      await repartidor.getByRole('dialog').getByRole('button', { name: 'Sí, lo tengo' }).click()
      await expect(mia.getByRole('link', { name: 'Entregar' })).toBeVisible()

      // Ya salió: no se puede liberar
      expect((await admin.request.post(`/api/entregas/${pedido.id}/liberar`)).status()).toBe(409)

      // Entrega con el código del cliente (lo ve solo el dueño)
      const propios = (await (await page.request.get('/api/pedidos?alcance=propios')).json()) as { data: Array<{ id: string; codigo_entrega: { codigo: string } | null }> }
      const codigo = propios.data.find((p) => p.id === pedido.id)?.codigo_entrega?.codigo
      expect(codigo).toMatch(/^[0-9]{4}$/)

      await mia.getByRole('link', { name: 'Entregar' }).click()
      await esperarCarga(repartidor)
      await expect(repartidor.getByText('Ya está pagado con QR: no cobres nada.')).toBeVisible()
      await repartidor.getByLabel('Código del cliente').fill(codigo!)
      // Fase 9G: el nombre viene escrito con el del cliente y se puede cambiar
      await expect(repartidor.getByLabel('Nombre de quien recibe')).not.toHaveValue('')
      await repartidor.getByLabel('Nombre de quien recibe').fill('Cliente E2E')
      await repartidor.getByRole('button', { name: 'Entregar', exact: true }).click()
      await expect(repartidor.getByRole('heading', { name: '¡Entregado!' })).toBeVisible()

      // Con QR verificado queda completado
      const cerrado = (await (await page.request.get(`/api/pedidos/${pedido.id}`)).json()) as { data: { estado: string } }
      expect(cerrado.data.estado).toBe('completado')

      // Ganado y por cobrar en el panel del repartidor
      await repartidor.goto('/repartidor')
      await esperarCarga(repartidor)
      await expect(repartidor.getByText('Por cobrar')).toBeVisible()
      const panel = (await (await repartidor.request.get('/api/repartidor/panel')).json()) as { data: { por_cobrar: number; ganado: number } }
      expect(panel.data.por_cobrar).toBeGreaterThan(0)
      expect(panel.data.ganado).toBeGreaterThanOrEqual(panel.data.por_cobrar)

      // El admin ve la deuda. Con un monto distinto del que se debe, «Pagado» frena (409) y no marca nada.
      // (No se paga de verdad: la prueba no deja pagos registrados)
      const deudas = (await (await admin.request.get('/api/repartidores')).json()) as { data: { repartidores: Array<{ id: string; por_pagar: number }> } }
      const deuda = deudas.data.repartidores.find((r) => Number(r.por_pagar) > 0)
      expect(deuda).toBeTruthy()
      const mal = await admin.request.post(`/api/repartidores/${deuda!.id}/pagar`, { data: { monto: Number(deuda!.por_pagar) + 1 } })
      expect(mal.status()).toBe(409)
      // Un repartidor no ve las deudas de nadie
      expect((await repartidor.request.get('/api/repartidores')).status()).toBe(403)

      await ponerDisponible(repartidor, false)
    } finally {
      await repartidor.context().close()
      await admin.context().close()
    }
  })
})
