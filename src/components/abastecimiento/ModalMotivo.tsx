'use client'
import { useState } from 'react'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBoton, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'

interface ModalMotivoProps {
  titulo: string
  explicacion: string
  textoConfirmar: string
  // Ruta de la API que recibe { motivo }
  url: string
  onCerrar: () => void
  onHecho: () => void
}

// Cancelar (admin) o rechazar (proveedor) una orden: siempre con motivo
export default function ModalMotivo({ titulo, explicacion, textoConfirmar, url, onCerrar, onHecho }: ModalMotivoProps) {
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      await enviarJson(url, 'POST', { motivo })
      onHecho()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={titulo} bloqueado={guardando} onCerrar={onCerrar}>
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <p className="text-sm text-texto-2">{explicacion}</p>
        <AvisoError mensaje={error} />
        <div>
          <label htmlFor="motivo-orden" className={claseEtiqueta}>Motivo</label>
          <textarea
            id="motivo-orden"
            required
            minLength={3}
            maxLength={300}
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={claseInput}
          />
          <p className={claseAyuda}>Lo ve la otra parte en la línea de tiempo.</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" autoFocus onClick={onCerrar} disabled={guardando} className={claseBoton('secundario')}>Volver</button>
          <button type="submit" disabled={guardando || motivo.trim().length < 3} className={claseBoton('peligro-lleno')}>
            {guardando ? 'Guardando…' : textoConfirmar}
          </button>
        </div>
      </form>
    </Modal>
  )
}
