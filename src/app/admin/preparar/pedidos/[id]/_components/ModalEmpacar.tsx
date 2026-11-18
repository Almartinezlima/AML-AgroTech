'use client'
import { useState } from 'react'
import { LuMinus, LuPlus } from 'react-icons/lu'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseBotonCantidad, claseBotonPrimario, claseBotonSecundario } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'

interface ModalEmpacarProps {
  pedidoId: string
  codigo: string
  esRecojo: boolean
  esDomicilio: boolean
  onCerrar: () => void
  onEmpacado: () => void
}

const MAX_BULTOS = 50

// "Listo para salir": registra quién y cuándo, y cuántos bultos (una etiqueta por bulto).
// A domicilio, la base avisa al grupo de repartidores por Telegram (0020).
export default function ModalEmpacar({ pedidoId, codigo, esRecojo, esDomicilio, onCerrar, onEmpacado }: ModalEmpacarProps) {
  const [bultos, setBultos] = useState(1)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async () => {
    setProcesando(true)
    setError('')
    try {
      await enviarJson(`/api/almacen/pedidos/${pedidoId}/empacar`, 'POST', { bultos })
      onEmpacado()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setProcesando(false)
    }
  }

  return (
    <Modal titulo={`${codigo}: listo para salir`} bloqueado={procesando} onCerrar={onCerrar}>
      <div className="flex flex-col gap-5">
        <AvisoError mensaje={error} />
        <p className="text-texto">
          {esRecojo
            ? 'El pedido quedará listo para que el cliente lo recoja en la tienda.'
            : esDomicilio
              ? 'El pedido quedará listo para salir. Se avisa al grupo de repartidores: el primero que acepta lo recoge en la tienda.'
              : 'El pedido quedará listo para salir por flota. Después lo despachas desde Envíos con la empresa y la guía.'}
        </p>
        <div>
          <p id="bultos-titulo" className="mb-2 text-sm font-medium text-texto-2">¿Cuántos bultos son?</p>
          <div className="flex items-center gap-3" role="group" aria-labelledby="bultos-titulo">
            <button type="button" onClick={() => setBultos((b) => Math.max(1, b - 1))} disabled={bultos <= 1 || procesando} className={claseBotonCantidad} aria-label="Un bulto menos">
              <LuMinus className="h-5 w-5" aria-hidden="true" />
            </button>
            <output className="min-w-12 text-center font-titulo text-3xl font-bold tabular-nums text-texto" aria-live="polite">{bultos}</output>
            <button type="button" onClick={() => setBultos((b) => Math.min(MAX_BULTOS, b + 1))} disabled={bultos >= MAX_BULTOS || procesando} className={claseBotonCantidad} aria-label="Un bulto más">
              <LuPlus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-sm text-texto-2">Después imprimes una etiqueta por bulto.</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={procesando} onClick={onCerrar} className={claseBotonSecundario}>Volver</button>
          <button type="button" disabled={procesando} onClick={() => void enviar()} className={claseBotonPrimario}>
            {procesando ? 'Guardando…' : 'Listo para salir'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
