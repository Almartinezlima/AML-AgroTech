import { defineConfig } from '@playwright/test'
import base from '../../playwright.config'

// Usa la misma configuración (variables, navegador) que las E2E, pero solo saca capturas.
// Requiere un servidor ya levantado: E2E_BASE_URL=http://localhost:3210
export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: 'capturas.spec.ts',
  reporter: 'line',
  outputDir: '../../test-results/capturas-salida',
  webServer: undefined,
  use: { ...base.use, baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
})
