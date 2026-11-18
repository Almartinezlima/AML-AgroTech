'use client'
import { useEffect, useState } from 'react'
import { LuCamera, LuFileText, LuImage, LuRefreshCw, LuSend } from 'react-icons/lu'
import { AvisoError } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, claseEnlace } from '@/components/ui/estilos'
import { mensajeDeError, pedirApi } from '@/lib/api/cliente'
import { ErrorImagen, MAX_BYTES_COMPROBANTE, prepararFotoComprobante } from '@/lib/pagos/imagen'

// Tres caminos: sacar la foto con la cámara, elegirla de la galería (sin «capture», así el
// celular muestra Galería/Fotos) o subir un PDF. Las fotos se achican a JPG antes de enviar.
// Muestra una vista previa antes de enviar.
export default function SubirComprobante({ pedidoId, onEnviado }: { pedidoId: string; onEnviado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [preparando, setPreparando] = useState(false)
  const [error, setError] = useState('')

  // La vista previa se libera al cambiar de archivo o al salir
  useEffect(() => {
    if (!archivo || !archivo.type.startsWith('image/')) { setVista(null); return }
    const url = URL.createObjectURL(archivo)
    setVista(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  const elegirFoto = async (entrada: HTMLInputElement) => {
    const elegido = entrada.files?.[0]
    entrada.value = '' // permite volver a elegir la misma foto
    if (!elegido) return
    setError('')
    setPreparando(true)
    try {
      setArchivo(await prepararFotoComprobante(elegido))
    } catch (causa) {
      setArchivo(null)
      setError(causa instanceof ErrorImagen ? causa.message : 'No pudimos abrir esa foto. Elige otra o sácala de nuevo.')
    } finally {
      setPreparando(false)
    }
  }

  const elegirPdf = (entrada: HTMLInputElement) => {
    const elegido = entrada.files?.[0]
    entrada.value = ''
    if (!elegido) return
    setError('')
    if (elegido.type !== 'application/pdf') {
      setArchivo(null)
      return setError('Ese archivo no es un PDF. Para una foto usa «Elegir de la galería».')
    }
    if (elegido.size > MAX_BYTES_COMPROBANTE) {
      setArchivo(null)
      return setError('El PDF pesa más de 3 MB. Mejor saca una foto del comprobante o una captura de pantalla.')
    }
    setArchivo(elegido)
  }

  const enviar = async () => {
    if (!archivo) return setError('Primero saca o elige la foto del comprobante; después toca «Enviar comprobante».')
    setSubiendo(true)
    setError('')
    try {
      const formulario = new FormData()
      formulario.append('archivo', archivo)
      await pedirApi(`/api/pagos/${pedidoId}/comprobante`, { method: 'POST', body: formulario })
      setArchivo(null)
      onEnviado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-acento/40 bg-acento/5 p-4">
      <p className="font-semibold text-texto">Envíanos tu comprobante</p>
      <AvisoError mensaje={error} />

      {preparando ? (
        <p className="rounded-xl border border-borde bg-tarjeta px-4 py-3 text-sm text-texto-2" role="status">Preparando la foto…</p>
      ) : !archivo ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* El input queda oculto: el botón visible es la etiqueta */}
            <label className={`${claseBotonPrimario} cursor-pointer`}>
              <LuCamera className="h-5 w-5" aria-hidden="true" /> Sacar foto
              <input type="file" accept="image/*" capture="environment" className="sr-only"
                aria-label="Sacar foto del comprobante con la cámara" onChange={(e) => void elegirFoto(e.currentTarget)} />
            </label>
            <label className={`${claseBotonSecundario} cursor-pointer`}>
              <LuImage className="h-5 w-5" aria-hidden="true" /> Elegir de la galería
              <input type="file" accept="image/*" className="sr-only"
                aria-label="Elegir foto del comprobante de la galería" onChange={(e) => void elegirFoto(e.currentTarget)} />
            </label>
          </div>
          <p className="text-sm text-texto-2">
            ¿Te lo mandaron en PDF?{' '}
            <label className={`${claseEnlace} inline-flex min-h-11 cursor-pointer items-center`}>
              Subir PDF
              <input type="file" accept="application/pdf" className="sr-only"
                aria-label="Subir comprobante en PDF" onChange={(e) => elegirPdf(e.currentTarget)} />
            </label>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por el optimizador
            <img src={vista} alt="Vista previa del comprobante" className="max-h-72 w-full rounded-xl border border-borde bg-white object-contain" />
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-borde bg-tarjeta px-4 py-3 text-sm text-texto">
              <LuFileText className="h-5 w-5 text-acento" aria-hidden="true" /> {archivo.name}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={() => void enviar()} disabled={subiendo} className={claseBotonPrimario}>
              <LuSend className="h-5 w-5" aria-hidden="true" /> {subiendo ? 'Enviando…' : 'Enviar comprobante'}
            </button>
            <button onClick={() => setArchivo(null)} disabled={subiendo} className={claseBotonSecundario}>
              <LuRefreshCw className="h-4 w-4" aria-hidden="true" /> Elegir otra foto
            </button>
          </div>
        </div>
      )}
      <p className="text-sm text-texto-2">Foto o PDF. Las fotos se achican solas antes de enviarse.</p>
    </div>
  )
}
