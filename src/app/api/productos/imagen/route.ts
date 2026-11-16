import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { ErrorApi, manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { leerArchivo, TIPOS_IMAGEN } from '@/lib/api/archivos'

const MAX_IMAGEN = 2 * 1024 * 1024
// Foto de producto: 800 px de lado mayor en WebP. Se ve igual en la ficha (560 px x2 ≈ 800 px reales
// en pantalla común) y pesa una fracción del original.
const LADO_MAXIMO = 800
const CALIDAD_WEBP = 80

// Copia liviana para la tienda. Respeta la orientación de la cámara (EXIF) y no agranda fotos chicas.
async function copiaWebp(bytes: Uint8Array) {
  try {
    return await sharp(bytes)
      .rotate()
      .resize({ width: LADO_MAXIMO, height: LADO_MAXIMO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: CALIDAD_WEBP, effort: 5 })
      .toBuffer()
  } catch {
    throw new ErrorApi(422, 'IMAGEN_ILEGIBLE', 'No se pudo leer la imagen. Prueba con otra foto en JPG o PNG.')
  }
}

// POST /api/productos/imagen — Solo admin. Guarda el original tal cual en productos/originales/
// y una copia WebP de 800 px en productos/; devuelve la URL pública de la copia.
// Nunca se borra nada: si falla la copia, el original queda guardado igual.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { bytes, tipo } = await leerArchivo(request, TIPOS_IMAGEN, MAX_IMAGEN)
  const id = randomUUID()
  const webp = await copiaWebp(bytes)

  const { error: errorOriginal } = await supabase.storage
    .from('productos')
    .upload(`originales/${id}.${tipo.extension}`, bytes, { contentType: tipo.mime })

  if (errorOriginal) throw errorOriginal

  const ruta = `${id}.webp`
  const { error } = await supabase.storage
    .from('productos')
    .upload(ruta, webp, { contentType: 'image/webp', cacheControl: '31536000' })

  if (error) throw error

  const { data } = supabase.storage.from('productos').getPublicUrl(ruta)

  return respuestaOk({ url: data.publicUrl }, 201)
})
