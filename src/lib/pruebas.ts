// Las cuentas de las pruebas E2E usan este dominio (no existe: nunca recibe correos)
export const DOMINIO_PRUEBAS = '@amlagrotech.test'

export function esCorreoPrueba(email: string | null | undefined) {
  return Boolean(email) && email!.toLowerCase().endsWith(DOMINIO_PRUEBAS)
}
