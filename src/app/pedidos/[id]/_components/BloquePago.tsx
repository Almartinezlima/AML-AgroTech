'use client'
import { useState } from 'react'
import InstruccionesPago from '@/components/pagos/InstruccionesPago'
import { AvisoError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPrimario, claseTarjeta } from '@/components/ui/estilos'
import { mensajeDeError, pedirApi } from '@/lib/api/cliente'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import type { PedidoDetalle } from '@/types/comercio'

const MAX_BYTES = 3 * 1024 * 1024

interface BloquePagoProps {
  pedido: PedidoDetalle
  esDueno: boolean
  onActualizado: () => void
}

export default function BloquePago({ pedido, esDueno, onActualizado }: BloquePagoProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const pago = pedido.pagos

  if (!pago) return null

  const puedeSubir = esDueno
    && pedido.estado !== 'cancelado'
    && pago.metodo !== 'contra_entrega'
    && (pago.estado === 'pendiente' || pago.estado === 'rechazado')

  const subir = async () => {
    if (!archivo) return setError('Selecciona tu comprobante.')
    if (archivo.size > MAX_BYTES) return setError('El archivo supera el máximo de 3 MB.')

    setSubiendo(true)
    setError('')
    try {
      const formulario = new FormData()
      formulario.append('archivo', archivo)
      await pedirApi(`/api/pagos/${pedido.id}/comprobante`, { method: 'POST', body: formulario })
      setArchivo(null)
      onActualizado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <section className={`${claseTarjeta} p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[#f0fdf4] font-bold">Pago · {ETIQUETA_METODO[pago.metodo]}</h2>
        <Insignia info={INFO_ESTADO_PAGO[pago.estado]} />
      </div>

      {pago.estado === 'rechazado' && pago.motivo_rechazo && (
        <p className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm break-words">
          Motivo del rechazo: {pago.motivo_rechazo}. Puedes subir otro comprobante.
        </p>
      )}

      {puedeSubir && <InstruccionesPago metodo={pago.metodo} monto={pago.monto} codigo={pedido.codigo} />}

      {pedido.comprobante_url && (
        <a href={pedido.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[#22c55e] text-sm hover:underline">
          Ver comprobante subido →
        </a>
      )}

      {puedeSubir && (
        <div className="flex flex-col gap-3">
          <AvisoError mensaje={error} />
          <label className="text-[#86efac] text-sm" htmlFor="comprobante">Comprobante (JPG, PNG, WEBP o PDF, máximo 3 MB)</label>
          <input
            id="comprobante"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="text-[#86efac] text-sm w-full min-w-0 file:mr-3 file:bg-[#162016] file:border file:border-[#1a2e1a] file:text-[#f0fdf4] file:rounded-lg file:px-3 file:py-2"
          />
          <button onClick={() => void subir()} disabled={subiendo || !archivo} className={claseBotonPrimario}>
            {subiendo ? 'Subiendo...' : 'Enviar comprobante'}
          </button>
        </div>
      )}
    </section>
  )
}
