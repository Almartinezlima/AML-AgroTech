// Cliente de la API para el navegador. No importar aquí nada de servidor.

interface RespuestaApi<T> {
  data?: T
  error?: { codigo: string; mensaje: string }
}

export async function pedirApi<T>(url: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones?.headers },
  })

  const cuerpo = (await respuesta.json().catch(() => null)) as RespuestaApi<T> | null

  if (!respuesta.ok || !cuerpo || cuerpo.data === undefined) {
    throw new Error(cuerpo?.error?.mensaje ?? 'No se pudo completar la acción. Intenta de nuevo.')
  }

  return cuerpo.data
}
