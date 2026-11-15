import type { Page } from '@playwright/test'
import { anotarOrden, esperarCarga, expect, paginaAdmin, paginaDistribuidor, test } from '../e2e/utilidades'

// Capturas de la fase 6B a 1280, 412 y 360 px, midiendo el scroll horizontal. Crea una orden
// de compra en cada estado con los distribuidores de prueba (0014) y las anula todas al
// terminar (fixture de limpieza: el stock y el costo vuelven a como estaban).
//   CAPTURAS_SPEC=abastecimiento-6b.spec.ts E2E_BASE_URL=http://localhost:3210 npx playwright test --config tests/capturas/playwright.capturas.ts
const SALIDA = process.env.CAPTURAS_DIR ?? 'test-results/capturas'
const ANCHOS = [1280, 412, 360]

async function capturar(page: Page, nombre: string, completa = true) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 860 })
    await page.waitForTimeout(400)
    const medida = await page.evaluate(() => document.documentElement.scrollWidth)
    console.log(`${nombre} ${ancho} px → página de ${medida} px${medida > ancho ? '  ← SCROLL HORIZONTAL' : ''}`)
    expect(medida, `${nombre} a ${ancho} px`).toBeLessThanOrEqual(ancho)
    await page.screenshot({ path: `${SALIDA}/fase6b-${nombre}-${ancho}.png`, fullPage: completa })
  }
  await page.setViewportSize({ width: 1280, height: 860 })
}

interface FichaApi { cuenta: { email: string } | null; presentaciones: { id: string; activo: boolean; disponible: boolean; productos: { nombre: string } | null }[] }

async function presentacion(admin: Page, correo: string, producto: string) {
  const fichas = ((await (await admin.request.get('/api/distribuidores')).json()) as { data: { distribuidores: FichaApi[] } }).data.distribuidores
  const pres = fichas.find((f) => f.cuenta?.email.toLowerCase() === correo.toLowerCase())
    ?.presentaciones.find((p) => p.activo && p.disponible && p.productos?.nombre === producto)
  expect(pres, producto).toBeTruthy()
  return pres!.id
}

async function post(pagina: Page, ruta: string, data: unknown = {}) {
  const respuesta = await pagina.request.post(ruta, { data })
  expect(respuesta.ok(), `${ruta}: ${await respuesta.text()}`).toBeTruthy()
  return ((await respuesta.json()) as { data: unknown }).data
}

function fechaEnDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('capturas de la fase 6B', async ({ browser }) => {
  test.setTimeout(600_000)
  const admin = await paginaAdmin(browser)
  const dist1 = await paginaDistribuidor(browser, 1)
  const dist2 = await paginaDistribuidor(browser, 2)
  const sucre = process.env.E2E_DIST1_EMAIL!
  const scz = process.env.E2E_DIST2_EMAIL!

  const glifosato = await presentacion(admin, sucre, 'Glifosato Basuka')
  const bravonil = await presentacion(admin, sucre, 'Bravonil Fungicida')
  const conector = await presentacion(admin, scz, 'Conector Inicial Goteo')
  const mancozeb = await presentacion(admin, scz, 'Mancozeb Dithane M-45')

  // Una orden por estado. "Armar" junta por proveedor en un solo borrador: se envía cada una
  // antes de armar la siguiente del mismo proveedor.
  const armar = async (lineas: { presentacion_id: string; cantidad: number }[]) => {
    const [orden] = (await post(admin, '/api/ordenes-compra', { lineas })) as { id: string }[]
    anotarOrden(orden.id)
    return orden.id
  }
  const enviar = (id: string) => post(admin, `/api/ordenes-compra/${id}/enviar`)
  const aceptar = (dist: Page, id: string) => post(dist, `/api/ordenes-compra/${id}/aceptar`, { fecha_estimada: fechaEnDias(3) })
  const despachar = (dist: Page, id: string) => post(dist, `/api/ordenes-compra/${id}/despachar`, { transportista: 'Trans Copacabana', guia: 'TC-4521' })

  const recibida = await armar([{ presentacion_id: glifosato, cantidad: 3 }, { presentacion_id: bravonil, cantidad: 2 }])
  await enviar(recibida); await aceptar(dist1, recibida); await despachar(dist1, recibida)
  const despachada = await armar([{ presentacion_id: conector, cantidad: 2 }])
  await enviar(despachada); await aceptar(dist2, despachada); await despachar(dist2, despachada)
  const aceptada = await armar([{ presentacion_id: mancozeb, cantidad: 1 }])
  await enviar(aceptada); await aceptar(dist2, aceptada)
  const rechazada = await armar([{ presentacion_id: conector, cantidad: 1 }])
  await enviar(rechazada)
  await post(dist2, `/api/ordenes-compra/${rechazada}/rechazar`, { motivo: 'Sin stock hasta fin de mes' })
  const cancelada = await armar([{ presentacion_id: glifosato, cantidad: 1 }])
  await post(admin, `/api/ordenes-compra/${cancelada}/cancelar`, { motivo: 'Se compró en la feria de Sucre' })
  const enviada = await armar([{ presentacion_id: bravonil, cantidad: 3 }])
  await enviar(enviada)
  const borrador = await armar([{ presentacion_id: glifosato, cantidad: 2 }, { presentacion_id: bravonil, cantidad: 1 }])

  // Abastecimiento con "Pedir otro producto" abierto y la lista con los datos de prueba
  await admin.goto('/admin/abastecimiento')
  await esperarCarga(admin)
  const interruptor = admin.getByRole('switch', { name: 'Mostrar datos de prueba' })
  if (!(await interruptor.isChecked())) await admin.getByText('Mostrar datos de prueba', { exact: true }).click()
  await esperarCarga(admin)
  await admin.getByRole('button', { name: 'Pedir otro producto' }).click()
  await admin.getByLabel('Buscar producto con proveedor').fill('glifosato')
  await capturar(admin, '1-abastecimiento')

  const verOrden = async (id: string, nombre: string) => {
    await admin.goto(`/admin/abastecimiento/ordenes/${id}`)
    await esperarCarga(admin)
    await capturar(admin, nombre)
  }
  await verOrden(borrador, '2-orden-borrador')
  await verOrden(enviada, '3-orden-enviada')
  await verOrden(aceptada, '4-orden-aceptada')
  await verOrden(despachada, '5-orden-despachada')

  // Recepción en modal (sin registrar) y la que sí se recibe con faltante
  await admin.goto(`/admin/abastecimiento/ordenes/${recibida}`)
  await esperarCarga(admin)
  await admin.getByRole('button', { name: 'Registrar recepción' }).click()
  await admin.getByRole('dialog').getByLabel(/Caja 12 × 1 L: llegaron/).fill('1')
  await capturar(admin, '6-recepcion', false)
  await admin.getByRole('dialog').getByRole('button', { name: 'Registrar recepción' }).click()
  await expect(admin.getByText('Recibida', { exact: true })).toBeVisible()
  await capturar(admin, '7-orden-recibida')

  await verOrden(rechazada, '8-orden-rechazada')
  await verOrden(cancelada, '9-orden-cancelada')

  await admin.goto('/admin/margen')
  await esperarCarga(admin)
  await capturar(admin, '10-margen')
  await admin.goto('/admin')
  await esperarCarga(admin)
  await capturar(admin, '11-panel-margen')

  // Lado del proveedor: su panel con órdenes y una orden por responder
  await dist1.goto('/distribuidor')
  await esperarCarga(dist1)
  await capturar(dist1, '12-proveedor-panel')
  await dist1.goto(`/distribuidor/ordenes/${enviada}`)
  await esperarCarga(dist1)
  await capturar(dist1, '13-proveedor-orden-enviada')
  await dist2.goto(`/distribuidor/ordenes/${aceptada}`)
  await esperarCarga(dist2)
  await capturar(dist2, '14-proveedor-orden-aceptada')
})
