import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ErrorApi } from '@/lib/api/respuestas'

const esquemaUuid = z.uuid()

// Valida un id de la URL. 400 si no es un uuid.
export function validarUuid(valor: string) {
  const resultado = esquemaUuid.safeParse(valor)

  if (!resultado.success) {
    throw new ErrorApi(400, 'ID_INVALIDO', 'El identificador no es válido.')
  }

  return resultado.data
}

// Lee y valida el JSON del cuerpo. 400 si está mal formado, 422 si no cumple el esquema.
export async function validarCuerpo<T extends z.ZodType>(request: NextRequest, esquema: T) {
  let cuerpo: unknown

  try {
    cuerpo = await request.json()
  } catch {
    throw new ErrorApi(400, 'JSON_INVALIDO', 'El cuerpo de la petición no es un JSON válido.')
  }

  const resultado = esquema.safeParse(cuerpo)

  if (!resultado.success) {
    const mensaje = resultado.error.issues[0]?.message ?? 'Los datos enviados no son válidos.'
    throw new ErrorApi(422, 'DATOS_INVALIDOS', mensaje)
  }

  return resultado.data as z.output<T>
}

// Valida los parámetros de la URL. 400 si no cumplen el esquema.
export function validarParametros<T extends z.ZodType>(request: NextRequest, esquema: T) {
  const resultado = esquema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  if (!resultado.success) {
    throw new ErrorApi(400, 'PARAMETROS_INVALIDOS', 'Los parámetros de la consulta no son válidos.')
  }

  return resultado.data as z.output<T>
}
