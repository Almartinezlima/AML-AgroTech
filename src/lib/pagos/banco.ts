// Cuenta bancaria real de la tienda para pagos por transferencia (fase 9C).
// Sale de variables de entorno de Render; si falta alguna, la transferencia no se ofrece:
// nunca se muestran datos inventados. Al ser NEXT_PUBLIC_, deben estar cargadas ANTES del build.
export interface DatosBanco {
  banco: string
  titular: string
  cuenta: string
  tipo: string
}

const limpio = (valor: string | undefined) => valor?.trim() || null

function leerBanco(): DatosBanco | null {
  // Acceso literal a cada variable: Next las reemplaza en el build
  const banco = limpio(process.env.NEXT_PUBLIC_BANCO_NOMBRE)
  const titular = limpio(process.env.NEXT_PUBLIC_BANCO_TITULAR)
  const cuenta = limpio(process.env.NEXT_PUBLIC_BANCO_CUENTA)
  const tipo = limpio(process.env.NEXT_PUBLIC_BANCO_TIPO)
  if (!banco || !titular || !cuenta || !tipo) return null
  return { banco, titular, cuenta, tipo }
}

export const DATOS_BANCO = leerBanco()
export const transferenciaDisponible = DATOS_BANCO !== null
