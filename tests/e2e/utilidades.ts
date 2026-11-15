import { expect, test as base, type Browser, type Page } from '@playwright/test'

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
  'Supabase tiene "Confirm email" encendido: la cuenta nueva no puede entrar sin abrir un correo. ' +
  'Apágalo en Authentication → Sign In / Providers → Email para correr la prueba de registro.'

// Marca la prueba como omitida (no fallida) si el registro no deja entrar directo
export async function exigirRegistroDirecto() {
  test.skip(!(await confirmacionApagada()), MOTIVO_CONFIRMACION)
}

export interface Cuenta {
  email: string
  password: string
}

function cuentaDeEntorno(prefijo: 'ADMIN' | 'CLIENTE'): Cuenta | null {
  const email = process.env[`E2E_${prefijo}_EMAIL`]
  const password = process.env[`E2E_${prefijo}_PASSWORD`]
  return email && password ? { email, password } : null
}

export const credencialesAdmin = () => cuentaDeEntorno('ADMIN')
export const credencialesCliente = () => cuentaDeEntorno('CLIENTE')

// Las pruebas solo pueden anular pedidos de cuentas de prueba (migración 0011)
export const DOMINIO_PRUEBAS = '@amlagrotech.test'

export function exigirAdmin() {
  const credenciales = credencialesAdmin()
  test.skip(!credenciales, 'Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.test.local')
  return credenciales!
}

// El cliente fijo de prueba. Hace falta el admin también: él anula los pedidos al terminar.
export function exigirCliente() {
  const credenciales = credencialesCliente()
  test.skip(!credenciales, 'Faltan E2E_CLIENTE_EMAIL y E2E_CLIENTE_PASSWORD en .env.test.local')
  exigirAdmin()
  if (!credenciales!.email.toLowerCase().endsWith(DOMINIO_PRUEBAS)) {
    throw new Error(`E2E_CLIENTE_EMAIL debe terminar en ${DOMINIO_PRUEBAS} para que sus pedidos se puedan limpiar`)
  }
  return credenciales!
}

// ───────────────────────── Limpieza ─────────────────────────

// Lo que crea cada prueba se anota aquí y se cierra al terminar, pase o falle (fixture `limpieza`)
const pedidosCreados = new Set<string>()
const cuentasCreadas = new Set<string>()

export function anotarPedido(id: string) {
  pedidosCreados.add(id)
}

// Anula un pedido de prueba con la cuenta admin: cancela en cualquier estado, devuelve el stock
// y cierra el pago. Si ya estaba cancelado no devuelve stock otra vez.
export async function anularPedidoPrueba(admin: Page, id: string) {
  const respuesta = await admin.request.post(`/api/pedidos/${id}/anular-prueba`)
  if (!respuesta.ok()) {
    throw new Error(`No se pudo anular el pedido de prueba ${id}: ${respuesta.status()} ${await respuesta.text()}`)
  }
}

export interface UsuarioListado {
  id: string
  email: string
  activo: boolean
}

export async function usuariosDePrueba(admin: Page): Promise<UsuarioListado[]> {
  const respuesta = await admin.request.get('/api/usuarios?pruebas=1')
  expect(respuesta.ok(), 'GET /api/usuarios?pruebas=1').toBeTruthy()
  return ((await respuesta.json()) as { data: UsuarioListado[] }).data
}

export async function desactivarCuenta(admin: Page, usuario: UsuarioListado) {
  const respuesta = await admin.request.patch(`/api/usuarios/${usuario.id}`, { data: { activo: false } })
  if (!respuesta.ok()) {
    throw new Error(`No se pudo desactivar ${usuario.email}: ${respuesta.status()} ${await respuesta.text()}`)
  }
}

// Cierra todo lo anotado. Se llama sola al final de cada prueba; también se puede llamar a mano
// para comprobar dentro de la prueba que la base quedó como estaba.
export async function limpiarDatosDePrueba(browser: Browser) {
  if (pedidosCreados.size === 0 && cuentasCreadas.size === 0) return

  const admin = await paginaAdmin(browser)
  try {
    for (const id of Array.from(pedidosCreados)) {
      await anularPedidoPrueba(admin, id)
      pedidosCreados.delete(id)
    }

    if (cuentasCreadas.size > 0) {
      const usuarios = await usuariosDePrueba(admin)
      for (const email of Array.from(cuentasCreadas)) {
        const usuario = usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (usuario?.activo) await desactivarCuenta(admin, usuario)
        cuentasCreadas.delete(email)
      }
    }
  } finally {
    await admin.context().close()
  }
}

// `test` con limpieza automática: todas las pruebas importan este en vez del de Playwright
export const test = base.extend<{ limpieza: void }>({
  limpieza: [
    async ({ browser }, use) => {
      await use()
      await limpiarDatosDePrueba(browser)
    },
    { auto: true },
  ],
})

export { expect }

// ───────────────────────── Datos ─────────────────────────

// Productos con mucho stock en el catálogo real, para no agotar nada
export const PRODUCTO_A = 'Conector Inicial Goteo'
export const PRODUCTO_B = 'Codo PVC 2" Roscado'

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

// Se registra por la pantalla, como un agricultor de verdad. Solo la prueba de registro crea
// cuentas: e2e+registro-<marca de tiempo>@amlagrotech.test, que se desactiva al terminar.
export async function registrarCuentaTemporal(page: Page): Promise<Cuenta> {
  const cuenta = { email: `e2e+registro-${Date.now()}${DOMINIO_PRUEBAS}`, password: `E2e-${Date.now()}-clave` }
  cuentasCreadas.add(cuenta.email)
  await page.goto('/auth/registro')
  await page.getByLabel('Nombre completo').fill('Registro E2E')
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

// Entra con el cliente fijo de prueba (E2E_CLIENTE_EMAIL)
export async function entrarComoCliente(page: Page, destino?: string): Promise<Cuenta> {
  const cuenta = exigirCliente()
  await iniciarSesion(page, cuenta, destino)
  return cuenta
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

// Espera a que se vaya el skeleton de la pantalla
export async function esperarCarga(page: Page) {
  await expect(page.getByRole('status', { name: 'Cargando' })).toHaveCount(0)
}

// Enciende o apaga "Mostrar datos de prueba" en la pantalla del panel donde está el admin.
// La preferencia queda guardada en el navegador y vale para las demás pantallas del panel.
export async function datosDePruebaEnPanel(admin: Page, mostrar: boolean) {
  const interruptor = admin.getByRole('switch', { name: 'Mostrar datos de prueba' })
  await esperarCarga(admin)
  if ((await interruptor.isChecked()) !== mostrar) {
    // El checkbox es invisible (sr-only): se toca la etiqueta, como una persona
    await admin.getByText('Mostrar datos de prueba', { exact: true }).click()
  }
  await expect(interruptor).toBeChecked({ checked: mostrar })
  await esperarCarga(admin)
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
// El pedido queda anotado para anularse al terminar la prueba.
// Abre el checkout y espera los datos recordados de la última compra (fase 4), para que
// el relleno automático no pise lo que escribe la prueba después.
export async function abrirCheckout(page: Page) {
  const recordados = page.waitForResponse((r) => r.url().includes('/api/pedidos/ultima-entrega'))
  await page.goto('/checkout')
  await recordados
  await expect(page.getByRole('heading', { name: 'Datos y envío' })).toBeVisible()
}

export async function finalizarCompra(page: Page, opciones: OpcionesCompra): Promise<PedidoHecho> {
  await abrirCheckout(page)
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
  await page.getByRole('button', { name: 'Elegir cómo pagar' }).click()

  // Paso Pago: el resumen con el total del servidor y la forma de pago en la misma pantalla
  await page.getByRole('radio', { name: new RegExp(opciones.metodo) }).check()

  // Se lee el resumen del paso Pago (el lateral repite los montos)
  const resumen = page.getByRole('region', { name: 'Resumen del pedido' })
  const fila = (etiqueta: string) => resumen.locator('div.flex.justify-between', { has: page.getByText(etiqueta, { exact: true }) }).last()
  await expect(fila('Total')).toBeVisible()
  const subtotal = leerBs(await fila('Subtotal').locator('span').last().innerText())
  const envio = leerBs(await fila('Envío').locator('span').last().innerText())
  const total = leerBs(await fila('Total').locator('span').last().innerText())

  await page.getByRole('button', { name: 'Confirmar pedido' }).click()
  await expect(page).toHaveURL(/\/checkout\/exito\?id=/)
  const id = new URL(page.url()).searchParams.get('id')!
  anotarPedido(id)
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
