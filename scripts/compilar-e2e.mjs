// Compila producción en .next-e2e ANTES de las E2E (npm run test:e2e:prod).
// Así el webServer de Playwright solo hace `next start`: en Windows, `build && start` dentro
// del mismo proceso que maneja Playwright se caía sin dejar error (fases 6A y 6B).
import { spawnSync } from 'node:child_process'

const resultado = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: '.next-e2e' },
})

process.exit(resultado.status ?? 1)
