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

export function respuestaError(estado: number, codigo: string, mensaje: string, detalle?: unknown) {
  return NextResponse.json(
    { error: { codigo, mensaje, ...(detalle === undefined ? {} : { detalle }) } },
    { status: estado }
  )
}

// Errores de la base. Los AML vienen de las funciones SQL con mensaje para el usuario.
const ERRORES_BASE: Record<string, { estado: number; codigo: string; mensaje?: string }> = {
  AML01: { estado: 409, codigo: 'STOCK_INSUFICIENTE' },
  AML02: { estado: 422, codigo: 'DATOS_INVALIDOS' },
  AML03: { estado: 403, codigo: 'SIN_PERMISO' },
  AML04: { estado: 404, codigo: 'NO_ENCONTRADO' },
  AML05: { estado: 409, codigo: 'ESTADO_NO_PERMITIDO' },
  AML06: { estado: 401, codigo: 'NO_AUTENTICADO' },
  '23505': { estado: 409, codigo: 'DUPLICADO', mensaje: 'Ya existe un registro con ese valor.' },
  '42501': { estado: 403, codigo: 'SIN_PERMISO', mensaje: 'No tienes permiso para esta acción.' },
}

interface ErrorBase {
  code: string
  message: string
  details?: string | null
}

function esErrorBase(error: unknown): error is ErrorBase {
  return typeof error === 'object' && error !== null && typeof (error as ErrorBase).code === 'string'
}

function leerDetalle(detalle: string | null | undefined) {
  if (!detalle) return undefined
  try {
    return JSON.parse(detalle) as unknown
  } catch {
    return undefined
  }
}

// Los errores inesperados se registran en el servidor y nunca se muestran al cliente
export function manejarError(error: unknown) {
  if (error instanceof ErrorApi) {
    return respuestaError(error.estado, error.codigo, error.message)
  }

  if (esErrorBase(error) && ERRORES_BASE[error.code]) {
    const conocido = ERRORES_BASE[error.code]
    return respuestaError(
      conocido.estado,
      conocido.codigo,
      conocido.mensaje ?? error.message,
      error.code === 'AML01' ? leerDetalle(error.details) : undefined
    )
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
