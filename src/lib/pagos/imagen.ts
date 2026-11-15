// Prepara la foto del comprobante en el celular antes de subirla: la achica a 1600 px como
// máximo y la pasa a JPG. Una foto de galería pesa 4 a 8 MB; así queda en unos cientos de KB.

export const MAX_BYTES_COMPROBANTE = 3 * 1024 * 1024
const LADO_MAXIMO = 1600
const CALIDADES = [0.82, 0.7, 0.55]

export class ErrorImagen extends Error {}

const MENSAJE_HEIC =
  'Tu celular guardó la foto en formato HEIC y no la podemos leer. Toca «Sacar foto» o haz una captura de pantalla del comprobante y elígela de la galería.'

function esHeic(archivo: File) {
  return /image\/hei[cf]/i.test(archivo.type) || /\.hei[cf]$/i.test(archivo.name)
}

// Lee la imagen respetando la orientación de la foto (EXIF)
async function decodificar(archivo: File): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    return { fuente: bitmap, ancho: bitmap.width, alto: bitmap.height, cerrar: () => bitmap.close() }
  }
  const url = URL.createObjectURL(archivo)
  try {
    const imagen = new Image()
    imagen.src = url
    await imagen.decode()
    return { fuente: imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, cerrar: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function aBlob(lienzo: HTMLCanvasElement, calidad: number) {
  return new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/jpeg', calidad))
}

// Devuelve un JPG listo para subir o lanza ErrorImagen con un mensaje para el cliente
export async function prepararFotoComprobante(archivo: File): Promise<File> {
  let imagen: Awaited<ReturnType<typeof decodificar>>
  try {
    imagen = await decodificar(archivo)
  } catch {
    throw new ErrorImagen(esHeic(archivo) ? MENSAJE_HEIC : 'No pudimos abrir esa foto. Elige otra o sácala de nuevo.')
  }

  try {
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.ancho, imagen.alto))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round(imagen.ancho * escala))
    lienzo.height = Math.max(1, Math.round(imagen.alto * escala))
    const contexto = lienzo.getContext('2d')
    if (!contexto) throw new ErrorImagen('Tu navegador no pudo preparar la foto. Prueba con «Subir PDF» o con otro navegador.')

    // Fondo blanco: un PNG transparente no queda negro al pasar a JPG
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, lienzo.width, lienzo.height)
    contexto.drawImage(imagen.fuente, 0, 0, lienzo.width, lienzo.height)

    for (const calidad of CALIDADES) {
      const blob = await aBlob(lienzo, calidad)
      if (blob && blob.size <= MAX_BYTES_COMPROBANTE) {
        return new File([blob], 'comprobante.jpg', { type: 'image/jpeg' })
      }
    }
    throw new ErrorImagen('La foto sigue muy pesada. Recórtala para que se vea solo el comprobante y vuelve a elegirla.')
  } finally {
    imagen.cerrar()
  }
}
