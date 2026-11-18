import { type Page } from '@playwright/test'
import {
  PRODUCTO_A, agregarAlCarrito, entrarComoCliente, esperarCarga, expect, finalizarCompra, idDeProducto,
  imagenComprobante, limpiarDatosDePrueba, paginaAdmin, stockDe, test,
} from './utilidades'

// Fase 9F: el admin prepara (sin rol almacén) y deja «Listo para salir»
async function prepararYDejarListo(admin: Page, id: string) {
  await admin.goto(`/admin/preparar/pedidos/${id}`)
  await esperarCarga(admin)
  await admin.getByRole('button', { name: 'Empezar a preparar' }).click()
  for (const casilla of await admin.getByRole('checkbox').all()) {
    await casilla.click()
    await expect(casilla).toHaveAttribute('aria-checked', 'true')
  }
  await admin.getByRole('button', { name: 'Listo para salir' }).click()
  await admin.getByRole('dialog').getByRole('button', { name: 'Listo para salir' }).click()
  await expect(admin.getByText('Despáchalo por flota desde Envíos.')).toBeVisible()
}

test.describe('Pagos y distribución', () => {
  test('comprobante → aprobación → preparación → listo para salir → despacho por flota → «Recibí mi pedido»', async ({ page, browser }) => {
    const productoId = await idDeProducto(page, PRODUCTO_A)
    const stockInicial = await stockDe(page, productoId)

    // Cliente: compra a provincia con QR y sube su comprobante
    await entrarComoCliente(page)
    await agregarAlCarrito(page, PRODUCTO_A)
    const pedido = await finalizarCompra(page, { zona: 'Culpina' })

    await page.goto(`/pedidos/${pedido.id}`)
    await page.getByLabel('Elegir la foto del pago de la galería').setInputFiles({ name: 'comprobante-e2e.png', mimeType: 'image/png', buffer: imagenComprobante() })
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByText('En revisión').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver comprobante/ })).toBeVisible()

    // Admin: el panel muestra los pedidos de cualquier cuenta, sin interruptor
    const admin = await paginaAdmin(browser)
    await admin.goto('/admin/pedidos')
    await expect(admin.getByRole('switch', { name: 'Mostrar datos de prueba' })).toHaveCount(0)
    await expect(admin.getByRole('link', { name: pedido.codigo, exact: true })).toBeVisible()

    // Aprueba el pago
    await admin.goto('/admin/pagos')
    const pago = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await pago.getByRole('button', { name: 'Aprobar' }).click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Aprobar' }).click()
    await expect(pago).toHaveCount(0)

    // El pedido quedó confirmado: el admin lo prepara, lo despacha por flota y el cliente confirma
    await admin.goto('/admin/pedidos')
    const tarjeta = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await expect(tarjeta.getByText('Confirmado', { exact: true })).toBeVisible()
    await expect(tarjeta.getByText('Pago verificado')).toBeVisible()

    const guia = `E2E-${Date.now()}`
    await prepararYDejarListo(admin, pedido.id)
    await admin.goto('/admin/pedidos')
    const lista = admin.locator('li', { has: admin.getByRole('link', { name: pedido.codigo, exact: true }) })
    await lista.getByRole('button', { name: 'Despachar por flota' }).click()
    const modal = admin.getByRole('dialog')
    await modal.getByLabel(/Empresa de flota/).fill('Trans Copacabana (E2E)')
    await modal.getByLabel(/Número de guía/).fill(guia)
    await modal.getByRole('button', { name: 'Confirmar' }).click()
    await expect(modal).toHaveCount(0)
    await expect(lista.getByText('En camino', { exact: true }).first()).toBeVisible()
    await admin.context().close()

    // Por flota no hay repartidor: el cliente recoge en la terminal y toca «Recibí mi pedido»
    await page.goto(`/pedidos/${pedido.id}`)
    await esperarCarga(page)
    await page.getByRole('button', { name: 'Recibí mi pedido' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, lo recibí' }).click()
    await expect(page.getByText('Completado', { exact: true }).first()).toBeVisible()

    // Cliente: ve la línea de tiempo completa con flota y guía
    await page.reload()
    const seguimiento = page.locator('section', { has: page.getByRole('heading', { name: 'Seguimiento' }) })
    // Nombres para el cliente (fase 4): Pendiente → Pedido recibido, Despachado → En camino
    for (const estado of ['Pedido recibido', 'Confirmado', 'Preparando', 'Listo para salir', 'En camino', 'Entregado']) {
      // "Pedido recibido" aparece dos veces: al crear el pedido y al subir el comprobante
      await expect(seguimiento.getByText(estado, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('Trans Copacabana (E2E)')).toBeVisible()
    await expect(page.getByText(guia)).toBeVisible()
    await expect(page.getByText('Pago verificado').first()).toBeVisible()

    // Limpieza: el pedido entregado se anula y el stock vuelve a lo de antes
    expect(await stockDe(page, productoId)).toBe(stockInicial - 1)
    await limpiarDatosDePrueba(browser)
    expect(await stockDe(page, productoId)).toBe(stockInicial)
    await page.reload()
    await expect(page.getByText('Cancelado', { exact: true }).first()).toBeVisible()
  })
})
