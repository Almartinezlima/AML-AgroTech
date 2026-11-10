'use client'
import { useEffect, useState } from 'react'
import { LuCamera, LuFileText, LuRefreshCw, LuSend } from 'react-icons/lu'
import { AvisoError } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario } from '@/components/ui/estilos'
import { mensajeDeError, pedirApi } from '@/lib/api/cliente'

const MAX_BYTES = 3 * 1024 * 1024
const TIPOS = 'image/jpeg,image/png,image/webp,application/pdf'

// Botón propio en español: en el celular abre la cámara; también deja elegir un archivo o PDF.
// Muestra una vista previa antes de enviar.
export default function SubirComprobante({ pedidoId, onEnviado }: { pedidoId: string; onEnviado: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  // La vista previa se libera al cambiar de archivo o al salir
  useEffect(() => {
    if (!archivo || !archivo.type.startsWith('image/')) { setVista(null); return }
    const url = URL.createObjectURL(archivo)
    setVista(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  const elegir = (lista: FileList | null) => {
    const elegido = lista?.[0] ?? null
    setError('')
    if (elegido && elegido.size > MAX_BYTES) {
      setArchivo(null)
      return setError('El archivo supera el máximo de 3 MB. Saca la foto de nuevo o recórtala.')
    }
    setArchivo(elegido)
  }

  const enviar = async () => {
    if (!archivo) return setError('Primero saca o elige la foto del comprobante.')
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

      {!archivo ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* El input queda oculto: el botón visible es la etiqueta */}
          <label className={`${claseBotonPrimario} cursor-pointer`}>
            <LuCamera className="h-5 w-5" aria-hidden="true" /> Subir foto del comprobante
            <input type="file" accept="image/*" capture="environment" className="sr-only"
              aria-label="Subir foto del comprobante" onChange={(e) => elegir(e.target.files)} />
          </label>
          <label className={`${claseBotonSecundario} cursor-pointer`}>
            <LuFileText className="h-5 w-5" aria-hidden="true" /> Elegir archivo o PDF
            <input type="file" accept={TIPOS} className="sr-only" aria-label="Elegir archivo o PDF de la galería"
              onChange={(e) => elegir(e.target.files)} />
          </label>
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
              <LuRefreshCw className="h-4 w-4" aria-hidden="true" /> Elegir otro
            </button>
          </div>
        </div>
      )}
      <p className="text-sm text-texto-2">JPG, PNG, WEBP o PDF, máximo 3 MB.</p>
    </div>
  )
}
