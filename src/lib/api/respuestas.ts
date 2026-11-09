import { NextResponse, type NextRequest } from 'next/server'

// Error esperado de la API: lleva el código HTTP y el mensaje para el usuario
export class ErrorApi extends Error {
  constructor(
    public readonly estado: number,
    public readonly codigo: string,
    mensaje: string
  ) {
    super(mensaje)
    this.name = 'ErrorApi'
  }
}

export function respuestaOk<T>(data: T, estado = 200) {
  return NextResponse.json({ data }, { status: estado })
}

export function respuestaError(estado: number, codigo: string, mensaje: string) {
  return NextResponse.json({ error: { codigo, mensaje } }, { status: estado })
}

// Los errores inesperados se registran en el servidor y nunca se muestran al cliente
export function manejarError(error: unknown) {
  if (error instanceof ErrorApi) {
    return respuestaError(error.estado, error.codigo, error.message)
  }

  console.error('Error inesperado en la API:', error)
  return respuestaError(500, 'ERROR_INTERNO', 'Ocurrió un error. Intenta de nuevo.')
}

// Envuelve un Route Handler para que todo error salga en el formato de la API
export function manejarRuta<C = { params: Record<string, string> }>(
  ruta: (request: NextRequest, contexto: C) => Promise<NextResponse>
) {
  return async (request: NextRequest, contexto: C) => {
    try {
      return await ruta(request, contexto)
    } catch (error) {
      return manejarError(error)
    }
  }
}
