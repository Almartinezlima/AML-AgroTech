// Cliente de la API para el navegador. No importar aquí nada de servidor.

interface RespuestaApi<T> {
  data?: T
  error?: { codigo: string; mensaje: string; detalle?: unknown }
}

export class ErrorPedidoApi extends Error {
  constructor(
    mensaje: string,
    public readonly estado: number,
    public readonly codigo?: string,
    public readonly detalle?: unknown
  ) {
    super(mensaje)
    this.name = 'ErrorPedidoApi'
  }
}

export async function pedirApi<T>(url: string, opciones?: RequestInit): Promise<T> {
  // Con FormData el navegador pone su propio Content-Type
  const esFormulario = opciones?.body instanceof FormData
  const respuesta = await fetch(url, {
    ...opciones,
    headers: esFormulario ? opciones?.headers : { 'Content-Type': 'application/json', ...opciones?.headers },
  })

  const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaApi<T> | null

  if (!respuesta.ok || !cuerpo || cuerpo.data === undefined) {
    throw new ErrorPedidoApi(
      cuerpo?.error?.mensaje ?? 'No se pudo completar la acción. Intenta de nuevo.',
      respuesta.status,
      cuerpo?.error?.codigo,
      cuerpo?.error?.detalle
    )
  }

  return cuerpo.data
}

export function enviarJson<T>(url: string, metodo: 'POST' | 'PATCH', cuerpo: unknown) {
  return pedirApi<T>(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

export function mensajeDeError(error: unknown, alternativo = 'Ocurrió un error. Intenta de nuevo.') {
  return error instanceof Error ? error.message : alternativo
}
