'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBotonPeligro, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import { ESTADOS_PAGO, type EstadoPago, type PagoAdmin } from '@/types/comercio'
import { LuCreditCard } from 'react-icons/lu'

export default function AdminPagosPage() {
  const [estado, setEstado] = useState<EstadoPago | ''>('en_revision')
  const { datos, cargando, error, recargar } = useDatosApi<PagoAdmin[]>(`/api/pagos${estado ? `?estado=${estado}` : ''}`)
  const [aprobando, setAprobando] = useState<PagoAdmin | null>(null)
  const [rechazando, setRechazando] = useState<PagoAdmin | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cerrar = useCallback(() => {
    setAprobando(null)
    setRechazando(null)
    setMotivo('')
    setErrorAccion('')
  }, [])

  const verificar = async (pago: PagoAdmin, aprobado: boolean) => {
    if (!aprobado && !motivo.trim()) return setErrorAccion('Indica el motivo del rechazo.')

    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/pagos/${pago.id}/verificar`, 'PATCH', { aprobado, motivo: aprobado ? null : motivo.trim() })
      cerrar()
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <h1 className="text-3xl font-bold text-[#f0fdf4]">Pagos</h1>
          <select value={estado} aria-label="Filtrar por estado" onChange={(e) => setEstado(e.target.value as EstadoPago | '')}
            className="bg-[#111811] border border-[#1a2e1a] text-[#f0fdf4] rounded-xl px-4 py-3 outline-none focus:border-[#22c55e]">
            <option value="">Todos</option>
            {ESTADOS_PAGO.map((e) => <option key={e} value={e}>{INFO_ESTADO_PAGO[e].etiqueta}</option>)}
          </select>
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : datos.length === 0 ? (
          <BloqueVacio icono={LuCreditCard} mensaje="No hay pagos con ese estado" />
        ) : (
          <ul className="flex flex-col gap-3">
            {datos.map((pago) => (
              <li key={pago.id} className={`${claseTarjeta} p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/pedidos/${pago.pedido_id}`} className="text-[#22c55e] font-mono font-bold hover:underline">{pago.pedidos?.codigo}</Link>
                    <p className="text-[#f0fdf4] text-sm break-words">{pago.cliente?.nombre ?? 'Cliente'}</p>
                    <p className="text-[#86efac] text-xs">{ETIQUETA_METODO[pago.metodo]}</p>
                    {pago.motivo_rechazo && <p className="text-red-400 text-xs break-words">Motivo: {pago.motivo_rechazo}</p>}
                  </div>
                  <Insignia info={INFO_ESTADO_PAGO[pago.estado]} />
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
                  <span className="text-[#f0fdf4] font-bold">{formatoBs(pago.monto)}</span>
                  <div className="flex gap-2 flex-wrap items-center">
                    {pago.comprobante_url && (
                      <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-[#22c55e] text-sm hover:underline">Ver comprobante</a>
                    )}
                    {pago.estado === 'en_revision' && (
                      <>
                        <button onClick={() => { setErrorAccion(''); setRechazando(pago) }} className={`${claseBotonPeligro} !px-3 !py-2 text-sm`}>Rechazar</button>
                        <button onClick={() => { setErrorAccion(''); setAprobando(pago) }} className={`${claseBotonPrimario} !px-3 !py-2 text-sm`}>Aprobar</button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aprobando && (
        <ModalConfirmacion
          titulo="Aprobar pago"
          mensaje={`Confirmas haber recibido ${formatoBs(aprobando.monto)} del pedido ${aprobando.pedidos?.codigo ?? ''}. El pedido pasará a confirmado.`}
          textoConfirmar="Aprobar"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void verificar(aprobando, true)}
          onCancelar={cerrar}
        />
      )}

      {rechazando && (
        <Modal titulo={`Rechazar pago de ${rechazando.pedidos?.codigo ?? ''}`} bloqueado={procesando} onCerrar={cerrar}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={errorAccion} />
            <div>
              <label htmlFor="motivo" className={claseEtiqueta}>Motivo (lo verá el cliente)</label>
              <textarea id="motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${claseInput} resize-none`} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button disabled={procesando} onClick={cerrar} className={claseBotonSecundario}>Volver</button>
              <button disabled={procesando} onClick={() => void verificar(rechazando, false)} className={claseBotonPeligro}>
                {procesando ? 'Guardando...' : 'Rechazar pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
