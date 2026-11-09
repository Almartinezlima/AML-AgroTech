import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { manejarRuta, respuestaOk } from '@/lib/api/respuestas'
import { requerirAdmin } from '@/lib/api/sesion'
import { leerArchivo, TIPOS_IMAGEN } from '@/lib/api/archivos'

const MAX_IMAGEN = 2 * 1024 * 1024

// POST /api/productos/imagen — Solo admin. Sube la imagen y devuelve su URL pública.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirAdmin()
  const { bytes, tipo } = await leerArchivo(request, TIPOS_IMAGEN, MAX_IMAGEN)
  const ruta = `${randomUUID()}.${tipo.extension}`

  const { error } = await supabase.storage
    .from('productos')
    .upload(ruta, bytes, { contentType: tipo.mime })

  if (error) throw error

  const { data } = supabase.storage.from('productos').getPublicUrl(ruta)

  return respuestaOk({ url: data.publicUrl }, 201)
})
