import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Variables públicas de Next (.env.local) para consultar la configuración de Auth
loadEnvConfig(process.cwd(), true)

// Credenciales de prueba (.env.test.local, ignorado por git). Nunca la service role.
const archivoPruebas = path.join(process.cwd(), '.env.test.local')
if (existsSync(archivoPruebas)) {
  for (const linea of readFileSync(archivoPruebas, 'utf8').split(/\r?\n/)) {
    const coincidencia = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (coincidencia && !process.env[coincidencia[1]]) {
      process.env[coincidencia[1]] = coincidencia[2].replace(/^["']|["']$/g, '')
    }
  }
}

const NEXT = 'node node_modules/next/dist/bin/next'

// Tres formas de correr (ver docs/PRUEBAS.md):
// - npm run test:e2e       → usa el `npm run dev` del puerto 3000 (o lo levanta si no hay)
// - npm run test:e2e:prod  → compila aparte en .next-e2e y levanta producción en el 3210
//                            (más rápido y estable; no toca el .next del `npm run dev`)
// - E2E_BASE_URL=…         → prueba contra un servidor ya levantado, sin levantar nada
const MODO_PRODUCCION = process.env.npm_lifecycle_event === 'test:e2e:prod' || process.env.E2E_PRODUCCION === '1'
const URL_EXTERNA = process.env.E2E_BASE_URL
const PUERTO = MODO_PRODUCCION ? 3210 : 3000
const URL_BASE = URL_EXTERNA ?? `http://localhost:${PUERTO}`

const servidor = MODO_PRODUCCION
  ? {
      command: `${NEXT} build && ${NEXT} start -p ${PUERTO}`,
      env: { NEXT_DIST_DIR: '.next-e2e' },
      url: URL_BASE,
      reuseExistingServer: false,
      timeout: 600_000,
    }
  : {
      // UN solo servidor en el 3000: si ya corre se reutiliza; con -p fijo, si el puerto
      // está ocupado por otra cosa falla en vez de abrir un segundo servidor en el 3001
      command: `npm run dev -- -p ${PUERTO}`,
      url: URL_BASE,
      reuseExistingServer: true,
      timeout: 180_000,
    }

export default defineConfig({
  testDir: './tests/e2e',
  // Todas las pruebas usan la misma base real: de a una para no pisarse ni topar límites de Auth
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: URL_BASE,
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    navigationTimeout: 45_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: URL_EXTERNA ? undefined : servidor,
})
