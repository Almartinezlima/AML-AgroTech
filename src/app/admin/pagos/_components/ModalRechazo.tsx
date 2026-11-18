'use client'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseBotonPeligro, claseBotonSecundario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import type { PagoAdmin } from '@/types/comercio'

interface ModalRechazoProps {
  pago: PagoAdmin
  motivo: string
  procesando: boolean
  error: string
  onMotivo: (motivo: string) => void
  onRechazar: () => void
  onVolver: () => void
}

// Rechazar un comprobante (foto del pago) con el motivo que verá el cliente
export default function ModalRechazo({ pago, motivo, procesando, error, onMotivo, onRechazar, onVolver }: ModalRechazoProps) {
  return (
    <Modal titulo={`Rechazar pago de ${pago.pedidos?.codigo ?? ''}`} bloqueado={procesando} onCerrar={onVolver}>
      <div className="flex flex-col gap-4">
        <AvisoError mensaje={error} />
        <div>
          <label htmlFor="motivo" className={claseEtiqueta}>Motivo (lo verá el cliente)</label>
          <textarea id="motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => onMotivo(e.target.value)} className={`${claseInput} resize-none`} />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button disabled={procesando} onClick={onVolver} className={claseBotonSecundario}>Volver</button>
          <button disabled={procesando} onClick={onRechazar} className={claseBotonPeligro}>
            {procesando ? 'Guardando…' : 'Rechazar pago'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
