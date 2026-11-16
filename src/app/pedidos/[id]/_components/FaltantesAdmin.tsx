'use client'
import { useState } from 'react'
import Link from 'next/link'
import ListaFaltantes from '@/components/almacen/ListaFaltantes'
import { AvisoError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBoton, claseBotonPrimario, claseBotonSecundario, claseEnlace, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import type { FaltantePedido } from '@/types/comercio'

interface FaltantesAdminProps {
  pedidoId: string
  faltantes: FaltantePedido[]
  onActualizado: () => void
}

// Faltantes del almacén en el detalle del pedido (solo admin). "Repuesto, continuar" lo
// marca resuelto con una nota y el almacén ya puede empacar. Si no hay cómo reponer, se cancela.
export default function FaltantesAdmin({ pedidoId, faltantes, onActualizado }: FaltantesAdminProps) {
  const [resolviendo, setResolviendo] = useState<FaltantePedido | null>(null)
  const [nota, setNota] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const abrir = (faltante: FaltantePedido) => {
    setNota('')
    setError('')
    setResolviendo(faltante)
  }

  const resolver = async () => {
    if (!resolviendo) return
    if (nota.trim().length < 3) return setError('Indica cómo se resolvió (al menos 3 letras).')
    setProcesando(true)
    setError('')
    try {
      await enviarJson(`/api/faltantes/${resolviendo.id}/resolver`, 'POST', { nota: nota.trim() })
      setResolviendo(null)
      onActualizado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <section className={`${claseTarjeta} p-5`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={claseTituloSeccion}>Faltantes del almacén</h2>
        <Link href={`/almacen/pedidos/${pedidoId}`} className={claseEnlace}>Ver en almacén</Link>
      </div>
      <ListaFaltantes
        faltantes={faltantes}
        accion={(f) => (
          <button type="button" onClick={() => abrir(f)} className={claseBoton('primario', 'chico')}>Repuesto, continuar</button>
        )}
      />

      {resolviendo && (
        <Modal titulo="Resolver faltante" bloqueado={procesando} onCerrar={() => setResolviendo(null)}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={error} />
            <p className="text-texto break-words">{resolviendo.producto ? `${resolviendo.producto}: ` : ''}{resolviendo.nota}</p>
            <div>
              <label htmlFor="resolucion" className={claseEtiqueta}>¿Cómo se resolvió?</label>
              <textarea id="resolucion" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)}
                placeholder="Ej.: se repuso del depósito, ya está en el estante" className={claseInput} />
              <p className={claseAyuda}>Queda en la línea de tiempo con tu nombre. El almacén ya podrá empacar.</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={procesando} onClick={() => setResolviendo(null)} className={claseBotonSecundario}>Volver</button>
              <button type="button" disabled={procesando} onClick={() => void resolver()} className={claseBotonPrimario}>
                {procesando ? 'Guardando…' : 'Repuesto, continuar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
