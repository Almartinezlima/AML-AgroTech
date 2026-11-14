import { z } from 'zod'

// Las cuentas de las pruebas E2E usan este dominio (no existe: nunca recibe correos)
export const DOMINIO_PRUEBAS = '@amlagrotech.test'

export function esCorreoPrueba(email: string | null | undefined) {
  return Boolean(email) && email!.toLowerCase().endsWith(DOMINIO_PRUEBAS)
}

// ?pruebas=1 en las listas del panel: incluye pedidos, pagos y cuentas de prueba
export const parametroPruebas = z
  .enum(['0', '1'], { error: 'El parámetro pruebas debe ser 0 o 1.' })
  .optional()
  .transform((valor) => valor === '1')
