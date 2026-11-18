'use client'
import { useState } from 'react'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import type { ItemPreparacion } from '@/types/almacen'

interface ModalFaltanteProps {
  pedidoId: string
  codigo: string
  items: ItemPreparacion[]
  onCerrar: () => void
  onReportado: () => void
}

// "Reportar faltante": avisa a la tienda (Telegram) y frena el empaque hasta que lo resuelva
export default function ModalFaltante({ pedidoId, codigo, items, onCerrar, onReportado }: ModalFaltanteProps) {
  const [itemId, setItemId] = useState('')
  const [nota, setNota] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async () => {
    if (nota.trim().length < 3) return setError('Describe qué falta (al menos 3 letras).')
    setProcesando(true)
    setError('')
    try {
      await enviarJson(`/api/almacen/pedidos/${pedidoId}/faltante`, 'POST', { nota: nota.trim(), item_id: itemId || null })
      onReportado()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setProcesando(false)
    }
  }

  return (
    <Modal titulo={`Reportar faltante en ${codigo}`} bloqueado={procesando} onCerrar={onCerrar}>
      <div className="flex flex-col gap-4">
        <AvisoError mensaje={error} />
        <div>
          <label htmlFor="faltante-producto" className={claseEtiqueta}>Producto</label>
          <select id="faltante-producto" value={itemId} onChange={(e) => setItemId(e.target.value)} className={claseInput}>
            <option value="">Otro / varios productos</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.nombre_producto}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="faltante-nota" className={claseEtiqueta}>¿Qué falta?</label>
          <textarea id="faltante-nota" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: solo hay 1 bolsa de las 2" className={claseInput} />
          <p className={claseAyuda}>La tienda recibe el aviso. El pedido no se puede empacar hasta que lo resuelva.</p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={procesando} onClick={onCerrar} className={claseBotonSecundario}>Volver</button>
          <button type="button" disabled={procesando} onClick={() => void enviar()} className={claseBotonPrimario}>
            {procesando ? 'Enviando…' : 'Reportar faltante'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
