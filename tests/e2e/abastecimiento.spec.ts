import type { Page } from '@playwright/test'
import {
  anotarOrden, entrarComoCliente, esperarCarga, exigirAdmin, exigirDistribuidor, expect, limpiarDatosDePrueba,
  paginaAdmin, paginaDistribuidor, stockDe, test,
} from './utilidades'

// Fase 6B: órdenes de compra, recepción con fraccionamiento y margen. Usa los 2 distribuidores
// de demostración (0014). Toda orden queda anotada y se anula al terminar
// (anular_orden_compra_prueba): el stock y el costo vuelven a como estaban.

const GLIFOSATO = 'Glifosato Basuka' // AGR-006, se vende por litro; Sucre: Bidón 20 L a Bs. 1.640
const BRAVONIL = 'Bravonil Fungicida' // AGR-002, por litro; Sucre: Caja 12 × 1 L a Bs. 1.080
const CONECTOR = 'Conector Inicial Goteo' // RIE-003, por unidad; Santa Cruz: Bolsa 100 unidades
const SIN_ID = '00000000-0000-4000-8000-000000000000'

interface PresentacionApi { id: string; producto_id: string; nombre: string; activo: boolean; disponible: boolean; productos: { nombre: string } | null }
interface FichaApi { id: string; cuenta: { email: string } | null; presentaciones: PresentacionApi[] }
interface MargenApi { id: string; nombre: string; costo: number | null; tipo_costo: string }

// Presentación activa de un distribuidor de prueba para un producto (por nombre)
async function presentacion(admin: Page, numero: 1 | 2, producto: string) {
  const correo = exigirDistribuidor(numero).email
  const fichas = ((await (await admin.request.get('/api/distribuidores')).json()) as { data: { distribuidores: FichaApi[] } }).data.distribuidores
  const ficha = fichas.find((f) => f.cuenta?.email.toLowerCase() === correo.toLowerCase())
  const pres = ficha?.presentaciones.find((p) => p.activo && p.disponible && p.productos?.nombre === producto)
  expect(pres, `${producto} del distribuidor ${numero}`).toBeTruthy()
  return pres!
}

// Arma y (opcionalmente) envía una orden por la API, anotada para la limpieza
async function ordenPorApi(admin: Page, lineas: { presentacion_id: string; cantidad: number }[], enviar = true) {
  const respuesta = await admin.request.post('/api/ordenes-compra', { data: { lineas } })
  expect(respuesta.status(), await respuesta.text()).toBe(201)
  const [orden] = ((await respuesta.json()) as { data: { id: string; codigo: string }[] }).data
  anotarOrden(orden.id)
  if (enviar) expect((await admin.request.post(`/api/ordenes-compra/${orden.id}/enviar`)).ok()).toBeTruthy()
  return orden
}

async function margenDe(admin: Page, productoId: string) {
  const datos = ((await (await admin.request.get('/api/margen')).json()) as { data: { productos: MargenApi[] } }).data
  return datos.productos.find((p) => p.id === productoId)!
}

// AAAA-MM-DD dentro de 3 días, en la hora local (nunca toISOString)
function fechaEnDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test.describe('Abastecimiento (órdenes de compra)', () => {
  test('circuito completo con recepción parcial, kardex, costo promedio y limpieza', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const glifosato = await presentacion(admin, 1, GLIFOSATO)
    const bravonil = await presentacion(admin, 1, BRAVONIL)
    const stockAntes = { g: await stockDe(admin, glifosato.producto_id), b: await stockDe(admin, bravonil.producto_id) }
    const margenAntes = await margenDe(admin, glifosato.producto_id)

    // 1. El admin arma la orden por la pantalla ("Pedir otro producto")
    await admin.goto('/admin/abastecimiento')
    await esperarCarga(admin)
    await admin.getByRole('button', { name: 'Pedir otro producto' }).click()
    for (const [nombre, pres, cantidad] of [[GLIFOSATO, glifosato, '3'], [BRAVONIL, bravonil, '2']] as const) {
      await admin.getByLabel('Buscar producto con proveedor').fill(nombre)
      const fila = admin.getByRole('listitem').filter({ has: admin.getByRole('checkbox', { name: `Pedir ${nombre}` }) })
      await fila.getByLabel('Proveedor y presentación').selectOption(pres.id)
      await fila.getByLabel('Cantidad').fill(cantidad)
      await expect(fila.getByRole('checkbox', { name: `Pedir ${nombre}` })).toBeChecked()
    }
    await admin.getByRole('button', { name: 'Armar orden' }).click()
    const enlace = admin.getByRole('status').getByRole('link', { name: /^OC-\d{6}$/ })
    await expect(enlace).toBeVisible()
    const codigo = (await enlace.innerText()).trim()
    const id = (await enlace.getAttribute('href'))!.split('/').pop()!
    anotarOrden(id)

    // 2. Borrador → enviada, con el aviso por WhatsApp armado
    await enlace.click()
    await esperarCarga(admin)
    await expect(admin.getByRole('heading', { level: 1 })).toHaveText(codigo)
    await expect(admin.getByText('Borrador', { exact: true })).toBeVisible()
    await admin.getByRole('button', { name: 'Enviar al proveedor' }).click()
    await admin.getByRole('dialog').getByRole('button', { name: 'Enviar orden' }).click()
    await expect(admin.getByText('Enviada', { exact: true })).toBeVisible()
    const whatsapp = await admin.getByRole('link', { name: 'Avisar por WhatsApp' }).getAttribute('href')
    expect(decodeURIComponent(whatsapp!)).toContain(`${codigo} de AML AgroTech`)

    // 3. El distribuidor la acepta con fecha y la despacha
    const dist = await paginaDistribuidor(browser, 1)
    await esperarCarga(dist)
    await expect(dist.getByText(codigo, { exact: true })).toBeVisible()
    await dist.goto(`/distribuidor/ordenes/${id}`)
    await esperarCarga(dist)
    await dist.getByLabel('¿Qué día la entregas?').fill(fechaEnDias(3))
    await dist.getByRole('button', { name: 'Aceptar orden' }).click()
    await expect(dist.getByText('Aceptada', { exact: true }).first()).toBeVisible()
    await dist.getByLabel('Transportista').fill('Trans E2E')
    await dist.getByLabel('Número de guía').fill('G-E2E-1')
    await dist.getByRole('button', { name: 'Despachar' }).click()
    await expect(dist.getByText('Despachada', { exact: true }).first()).toBeVisible()

    // Lo que ve el proveedor: ni stock, ni costos, ni datos internos
    const vista = await (await dist.request.get(`/api/ordenes-compra/${id}`)).text()
    for (const campo of ['"stock"', 'costo_promedio', 'es_prueba', 'presentaciones_disponibles', 'creado_por', 'email']) {
      expect(vista, `el proveedor no ve ${campo}`).not.toContain(campo)
    }

    // Una orden despachada ya no se cancela
    expect((await admin.request.post(`/api/ordenes-compra/${id}/cancelar`, { data: { motivo: 'Prueba E2E' } })).status()).toBe(409)

    // 4. Recepción: todo el glifosato (3 bidones = 60 litros) y 1 de 2 cajas de Bravonil
    await admin.reload()
    await esperarCarga(admin)
    await admin.getByRole('button', { name: 'Registrar recepción' }).click()
    const modal = admin.getByRole('dialog')
    await expect(modal.getByText(new RegExp(`= 60 litros · costo Bs\\. 82,00/litro · stock ${stockAntes.g} → ${stockAntes.g + 60}`))).toBeVisible()
    await modal.getByLabel(/Caja 12 × 1 L: llegaron/).fill('1')
    await expect(modal.getByText(/= 12 litros .* faltan 1/)).toBeVisible()
    await modal.getByRole('button', { name: 'Registrar recepción' }).click()
    await expect(admin.getByText('Recibida', { exact: true })).toBeVisible()
    await expect(admin.getByText(/Recibido: 1 de 2 .* faltan 1/)).toBeVisible()
    await expect(admin.getByText('Recibida con faltante en 1 línea')).toBeVisible()

    // Stock fraccionado, kardex con costo y costo promedio ponderado
    expect(await stockDe(admin, glifosato.producto_id)).toBe(stockAntes.g + 60)
    expect(await stockDe(admin, bravonil.producto_id)).toBe(stockAntes.b + 12)
    const kardex = (await (await admin.request.get(`/api/inventario/movimientos?producto=${glifosato.producto_id}`)).json()) as { data: { motivo: string; tipo: string }[] }
    expect(kardex.data.some((m) => m.tipo === 'entrada' && m.motivo === `Compra ${codigo}: 3 Bidón 20 L = 60 litros`)).toBe(true)
    const esperado = margenAntes.tipo_costo === 'real'
      ? (stockAntes.g * margenAntes.costo! + 60 * 82) / (stockAntes.g + 60)
      : 82
    const margenDespues = await margenDe(admin, glifosato.producto_id)
    expect(margenDespues.tipo_costo).toBe('real')
    expect(margenDespues.costo!).toBeCloseTo(esperado, 3)

    // 5. Limpieza: el stock y el costo vuelven a como estaban
    await limpiarDatosDePrueba(browser)
    expect(await stockDe(admin, glifosato.producto_id)).toBe(stockAntes.g)
    expect(await stockDe(admin, bravonil.producto_id)).toBe(stockAntes.b)
    const margenFinal = await margenDe(admin, glifosato.producto_id)
    expect(margenFinal.tipo_costo).toBe(margenAntes.tipo_costo)
    expect(margenFinal.costo).toBeCloseTo(margenAntes.costo ?? 0, 3)
  })

  test('el distribuidor rechaza con motivo y el admin lo ve', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const conector = await presentacion(admin, 2, CONECTOR)
    const stockAntes = await stockDe(admin, conector.producto_id)
    const orden = await ordenPorApi(admin, [{ presentacion_id: conector.id, cantidad: 1 }])

    const dist = await paginaDistribuidor(browser, 2)
    await dist.goto(`/distribuidor/ordenes/${orden.id}`)
    await esperarCarga(dist)
    await dist.getByRole('button', { name: 'Rechazar orden' }).click()
    await dist.getByRole('dialog').getByLabel('Motivo').fill('Sin stock hasta fin de mes (E2E)')
    await dist.getByRole('dialog').getByRole('button', { name: 'Rechazar orden' }).click()
    await expect(dist.getByText('Rechazada', { exact: true }).first()).toBeVisible()

    await admin.goto(`/admin/abastecimiento/ordenes/${orden.id}`)
    await esperarCarga(admin)
    await expect(admin.getByText('Motivo del rechazo:')).toBeVisible()
    await expect(admin.getByText('Sin stock hasta fin de mes (E2E)').first()).toBeVisible()
    expect(await stockDe(admin, conector.producto_id)).toBe(stockAntes)
  })

  test('el admin cancela con motivo y el distribuidor ya no puede aceptarla', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const glifosato = await presentacion(admin, 1, GLIFOSATO)
    const orden = await ordenPorApi(admin, [{ presentacion_id: glifosato.id, cantidad: 1 }])

    await admin.goto(`/admin/abastecimiento/ordenes/${orden.id}`)
    await esperarCarga(admin)
    await admin.getByRole('button', { name: 'Cancelar orden' }).click()
    await admin.getByRole('dialog').getByLabel('Motivo').fill('Compramos en otro lado (E2E)')
    await admin.getByRole('dialog').getByRole('button', { name: 'Cancelar orden' }).click()
    await expect(admin.getByText('Cancelada', { exact: true }).first()).toBeVisible()

    const dist = await paginaDistribuidor(browser, 1)
    await dist.goto(`/distribuidor/ordenes/${orden.id}`)
    await esperarCarga(dist)
    await expect(dist.getByText('Cancelada', { exact: true }).first()).toBeVisible()
    await expect(dist.getByText('Compramos en otro lado (E2E)').first()).toBeVisible()
    await expect(dist.getByRole('button', { name: 'Aceptar orden' })).toHaveCount(0)
    const intento = await dist.request.post(`/api/ordenes-compra/${orden.id}/aceptar`, { data: { fecha_estimada: fechaEnDias(2) } })
    expect(intento.status()).toBe(409)
  })

  test('un distribuidor no ve ni toca las órdenes del otro ni las del admin', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const glifosato = await presentacion(admin, 1, GLIFOSATO)
    const orden = await ordenPorApi(admin, [{ presentacion_id: glifosato.id, cantidad: 1 }], false)

    // El borrador es de la tienda: ni su dueño lo ve
    const sucre = await paginaDistribuidor(browser, 1)
    expect((await sucre.request.get(`/api/ordenes-compra/${orden.id}`)).status()).toBe(404)
    expect((await admin.request.post(`/api/ordenes-compra/${orden.id}/enviar`)).ok()).toBeTruthy()
    expect((await sucre.request.get(`/api/ordenes-compra/${orden.id}`)).status()).toBe(200)

    // El otro distribuidor: no existe para él, ni para leer ni para actuar
    const scz = await paginaDistribuidor(browser, 2)
    expect((await scz.request.get(`/api/ordenes-compra/${orden.id}`)).status()).toBe(404)
    expect((await scz.request.post(`/api/ordenes-compra/${orden.id}/aceptar`, { data: { fecha_estimada: fechaEnDias(2) } })).status()).toBe(404)
    expect((await scz.request.post(`/api/ordenes-compra/${orden.id}/rechazar`, { data: { motivo: 'No es mía' } })).status()).toBe(404)
    expect((await scz.request.post(`/api/ordenes-compra/${orden.id}/despachar`, { data: { transportista: 'X Y', guia: '1' } })).status()).toBe(404)
    const listaScz = ((await (await scz.request.get('/api/distribuidor/ordenes')).json()) as { data: { id: string }[] }).data
    expect(listaScz.some((o) => o.id === orden.id)).toBe(false)
    await scz.goto(`/distribuidor/ordenes/${orden.id}`)
    await expect(scz.getByText('Esa orden no existe')).toBeVisible()

    // Las acciones y pantallas del admin están cerradas para el proveedor
    for (const accion of ['enviar', 'recibir', 'anular-prueba']) {
      expect((await sucre.request.post(`/api/ordenes-compra/${orden.id}/${accion}`, { data: { lineas: [] } })).status(), accion).toBe(403)
    }
    expect((await sucre.request.post(`/api/ordenes-compra/${orden.id}/cancelar`, { data: { motivo: 'Prueba E2E' } })).status()).toBe(403)
    for (const ruta of ['/api/ordenes-compra', '/api/margen', '/api/abastecimiento/reponer']) {
      expect((await sucre.request.get(ruta)).status(), ruta).toBe(403)
    }
    await sucre.goto('/admin/abastecimiento')
    await expect(sucre).toHaveURL((url) => url.pathname === '/')
  })

  test('un cliente no entra al abastecimiento ni a las órdenes', async ({ page }) => {
    await entrarComoCliente(page)
    for (const ruta of ['/admin/abastecimiento', '/admin/margen', `/distribuidor/ordenes/${SIN_ID}`]) {
      await page.goto(ruta)
      await expect(page, ruta).toHaveURL((url) => url.pathname === '/')
    }
    for (const ruta of ['/api/ordenes-compra', `/api/ordenes-compra/${SIN_ID}`, '/api/distribuidor/ordenes', '/api/margen', '/api/abastecimiento/reponer']) {
      expect((await page.request.get(ruta)).status(), ruta).toBe(403)
    }
    expect((await page.request.post(`/api/ordenes-compra/${SIN_ID}/aceptar`, { data: { fecha_estimada: fechaEnDias(2) } })).status()).toBe(403)
    expect((await page.request.post('/api/ordenes-compra', { data: { lineas: [{ presentacion_id: SIN_ID, cantidad: 1 }] } })).status()).toBe(403)
  })

  test('360 px sin scroll horizontal en abastecimiento, orden y margen', async ({ browser }) => {
    exigirAdmin()
    const admin = await paginaAdmin(browser)
    const glifosato = await presentacion(admin, 1, GLIFOSATO)
    const orden = await ordenPorApi(admin, [{ presentacion_id: glifosato.id, cantidad: 2 }])
    const dist = await paginaDistribuidor(browser, 1)

    for (const [pagina, ruta] of [
      [admin, '/admin/abastecimiento'], [admin, `/admin/abastecimiento/ordenes/${orden.id}`], [admin, '/admin/margen'], [admin, '/admin'],
      [dist, '/distribuidor'], [dist, `/distribuidor/ordenes/${orden.id}`],
    ] as const) {
      await pagina.setViewportSize({ width: 360, height: 780 })
      await pagina.goto(ruta)
      await pagina.waitForLoadState('networkidle')
      await esperarCarga(pagina)
      const ancho = await pagina.evaluate(() => document.documentElement.scrollWidth)
      expect(ancho, `${ruta} mide ${ancho}px en 360px`).toBeLessThanOrEqual(360)
    }
  })
})
