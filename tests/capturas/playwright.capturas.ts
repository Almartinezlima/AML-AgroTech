import { defineConfig } from '@playwright/test'
import base from '../../playwright.config'

// Usa la misma configuración (variables, navegador) que las E2E, pero solo saca capturas.
// Requiere un servidor ya levantado: E2E_BASE_URL=http://localhost:3210
export default defineConfig({
  ...base,
  testDir: '.',
  // CAPTURAS_SPEC=compra-facil.spec.ts para las de la fase 4 (crean un pedido de prueba que se anula solo)
  testMatch: process.env.CAPTURAS_SPEC ?? 'capturas.spec.ts',
  reporter: 'line',
  outputDir: '../../test-results/capturas-salida',
  webServer: undefined,
  // Sin el barrido de las E2E: las capturas solo leen
  projects: [{ name: 'chromium' }],
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
})
