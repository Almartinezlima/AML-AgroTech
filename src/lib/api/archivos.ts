import type { NextRequest } from 'next/server'
import { ErrorApi } from '@/lib/api/respuestas'

export interface TipoArchivo {
  mime: string
  extension: string
  coincide: (b: Uint8Array) => boolean
}

const ascii = (b: Uint8Array, inicio: number, fin: number) =>
  Array.from(b.slice(inicio, fin)).map((c) => String.fromCharCode(c)).join('')

const JPG: TipoArchivo = { mime: 'image/jpeg', extension: 'jpg', coincide: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }
const PNG: TipoArchivo = { mime: 'image/png', extension: 'png', coincide: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 }
const WEBP: TipoArchivo = {
  mime: 'image/webp',
  extension: 'webp',
  coincide: (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
}
const PDF: TipoArchivo = { mime: 'application/pdf', extension: 'pdf', coincide: (b) => ascii(b, 0, 4) === '%PDF' }

export const TIPOS_IMAGEN = [JPG, PNG, WEBP]
export const TIPOS_COMPROBANTE = [JPG, PNG, WEBP, PDF]

// Lee el archivo "archivo" del formulario. Comprueba tamaño y contenido real, no solo la extensión.
export async function leerArchivo(request: NextRequest, tipos: TipoArchivo[], maxBytes: number) {
  let formulario: FormData

  try {
    formulario = await request.formData()
  } catch {
    throw new ErrorApi(400, 'FORMULARIO_INVALIDO', 'No se pudo leer el archivo enviado.')
  }

  const archivo = formulario.get('archivo')

  if (!(archivo instanceof File) || archivo.size === 0) {
    throw new ErrorApi(422, 'ARCHIVO_REQUERIDO', 'Selecciona un archivo.')
  }

  if (archivo.size > maxBytes) {
    throw new ErrorApi(422, 'ARCHIVO_GRANDE', `El archivo supera el máximo de ${Math.round(maxBytes / 1048576)} MB.`)
  }

  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const tipo = tipos.find((t) => t.mime === archivo.type && t.coincide(bytes))

  if (!tipo) {
    throw new ErrorApi(422, 'ARCHIVO_NO_PERMITIDO', 'El tipo de archivo no está permitido.')
  }

  return { bytes, tipo }
}
