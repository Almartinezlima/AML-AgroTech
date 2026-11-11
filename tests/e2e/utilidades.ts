import { expect, test, type Browser, type Page } from '@playwright/test'

// ───────────────────────── Configuración ─────────────────────────

let autoconfirmacion: Promise<boolean> | null = null

// ¿"Confirm email" está apagado? Se consulta la configuración pública de Supabase Auth
// (la misma que lee el navegador, con la clave pública). Así no se mandan correos que reboten.
export function confirmacionApagada(): Promise<boolean> {
  autoconfirmacion ??= (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !clave) return false
    const respuesta = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: clave } })
    if (!respuesta.ok) return false
    const datos = (await respuesta.json()) as { mailer_autoconfirm?: boolean }
    return datos.mailer_autoconfirm === true
  })()
  return autoconfirmacion
}

const MOTIVO_CONFIRMACION =
  'Supabase tiene "Confirm email" encendido: los clientes de prueba no pueden entrar sin abrir un correo. ' +
  'Apágalo en Authentication → Sign In / Providers → Email para correr estas pruebas.'

// Marca la prueba como omitida (no fallida) si no se pueden crear clientes de prueba
export async function exigirRegistroDirecto() {
  test.skip(!(await confirmacionApagada()), MOTIVO_CONFIRMACION)
}

export function credencialesAdmin() {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  return email && password ? { email, password } : null
}

export function exigirAdmin() {
  const credenciales = credencialesAdmin()
  test.skip(!credenciales, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.test.local')
  return credenciales!
}

// ───────────────────────── Datos ─────────────────────────

// Productos con mucho stock en el catálogo real, para no agotar nada
export const PRODUCTO_A = 'Conector Inicial Goteo'
export const PRODUCTO_B = 'Codo PVC 2" Roscado'

let contador = 0
// Correo único y fácil de filtrar: e2e+<marca de tiempo>@amlagrotech.test
export function correoPrueba() {
  contador += 1
  return `e2e+${Date.now()}${contador}@amlagrotech.test`
}

// "Bs. 1.234,50" → 1234.5
export function leerBs(texto: string): number {
  const limpio = texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return Number(limpio)
}

// PNG válido de 1×1 px generado en la prueba (sirve como comprobante de pago)
export function imagenComprobante(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
}

// ───────────────────────── Acciones de usuario ─────────────────────────

export interface Cuenta {
  email: string
  password: string
}

// Se registra por la pantalla, como un agricultor de verdad
export async function registrarCliente(page: Page): Promise<Cuenta> {
  const cuenta = { email: correoPrueba(), password: `E2e-${Date.now()}-clave` }
  await page.goto('/auth/registro')
  await page.getByLabel('Nombre completo').fill('Cliente E2E')
  await page.getByLabel('Correo electrónico').fill(cuenta.email)
  await page.getByLabel('Teléfono / WhatsApp').fill('70012345')
  await page.getByLabel('Contraseña').fill(cuenta.password)
  await page.getByRole('button', { name: 'Crear cuenta gratis' }).click()
  await expect(page).toHaveURL(/\/catalogo/)
  return cuenta
}

export async function iniciarSesion(page: Page, cuenta: Cuenta, destino?: string) {
  await page.goto(destino ? `/auth/login?siguiente=${encodeURIComponent(destino)}` : '/auth/login')
  await page.getByLabel('Correo electrónico').fill(cuenta.email)
  await page.getByLabel('Contraseña').fill(cuenta.password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

// "Salir" del menú: espera a que termine la navegación completa al inicio
export async function cerrarSesion(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByRole('link', { name: 'Ingresar' }).first()).toBeVisible()
}

// Contexto nuevo (cookies propias) con el admin dentro
export async function paginaAdmin(browser: Browser): Promise<Page> {
  const credenciales = exigirAdmin()
  const contexto = await browser.newContext()
  const pagina = await contexto.newPage()
  await iniciarSesion(pagina, credenciales, '/admin')
  await expect(pagina).toHaveURL(/\/admin/)
  return pagina
}

export async function agregarAlCarrito(page: Page, nombre: string) {
  if (!page.url().includes('/catalogo')) await page.goto('/catalogo')
  await page.getByLabel('Buscar producto').fill(nombre)
  // Cada producto es un <article>; se busca por su nombre, no por clases de diseño
  const tarjeta = page.getByRole('article').filter({ has: page.getByRole('link', { name: nombre, exact: true }) })
  await tarjeta.getByRole('button', { name: /Agregar al carrito/ }).click()
  await expect(tarjeta.getByRole('button', { name: /Agregado/ })).toBeVisible()
}

export interface OpcionesCompra {
  zona: string
  metodo: 'QR' | 'Transferencia' | 'Contra entrega'
  direccion?: string
  // Zonas por flota: quién recoge la encomienda
  recogeNombre?: string
  recogeCi?: string
}

export interface PedidoHecho {
  id: string
  codigo: string
  subtotal: number
  envio: number
  total: number
}

// Del carrito al pedido confirmado. Devuelve el código AML-… y los montos del resumen.
export async function finalizarCompra(page: Page, opciones: OpcionesCompra): Promise<PedidoHecho> {
  await page.goto('/checkout')
  await page.getByRole('radio', { name: new RegExp(opciones.zona) }).check()
  const direccion = page.getByLabel(/Dirección/)
  if (await direccion.isVisible()) await direccion.fill(opciones.direccion ?? 'E2E — Calle Bolívar 123')
  const recoge = page.getByLabel('Nombre de quien recoge')
  if (await recoge.isVisible()) {
    await recoge.fill(opciones.recogeNombre ?? 'Recoge E2E')
    await page.getByLabel('CI de quien recoge').fill(opciones.recogeCi ?? '1234567')
  }
  await page.getByLabel('Teléfono / WhatsApp').fill('70012345')
  await page.getByLabel('Notas (opcional)').fill('E2E: pedido de prueba automática')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.getByRole('radio', { name: new RegExp(opciones.metodo) }).check()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Se lee el resumen del paso 3 (el lateral repite los montos)
  const resumen = page.getByRole('region', { name: 'Resumen del pedido' })
  const fila = (etiqueta: string) => resumen.locator('div.flex.justify-between', { has: page.getByText(etiqueta, { exact: true }) }).last()
  await expect(fila('Total')).toBeVisible()
  const subtotal = leerBs(await fila('Subtotal').locator('span').last().innerText())
  const envio = leerBs(await fila('Envío').locator('span').last().innerText())
  const total = leerBs(await fila('Total').locator('span').last().innerText())

  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/checkout\/exito\?id=/)
  const id = new URL(page.url()).searchParams.get('id')!
  const codigo = (await page.getByText(/^AML-/).first().innerText()).trim()
  return { id, codigo, subtotal, envio, total }
}

// Stock real del producto, leído de la API pública
export async function stockDe(page: Page, productoId: string): Promise<number> {
  const respuesta = await page.request.get(`/api/productos/${productoId}`)
  expect(respuesta.ok()).toBeTruthy()
  const cuerpo = (await respuesta.json()) as { data: { stock: number } }
  return cuerpo.data.stock
}

export async function idDeProducto(page: Page, nombre: string): Promise<string> {
  await page.goto('/catalogo')
  await page.getByLabel('Buscar producto').fill(nombre)
  const enlace = page.getByRole('link', { name: nombre, exact: true })
  const href = await enlace.getAttribute('href')
  return href!.split('/').pop()!
}
