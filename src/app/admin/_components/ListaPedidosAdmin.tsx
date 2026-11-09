'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AvisoError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBotonPeligro, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput, claseTarjeta } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { ETIQUETA_METODO, INFO_ESTADO_PAGO, INFO_ESTADO_PEDIDO, fechaHora, siguienteEstado } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoResumen } from '@/types/comercio'

interface ListaPedidosAdminProps {
  pedidos: PedidoResumen[]
  onActualizado: () => void
}

export default function ListaPedidosAdmin({ pedidos, onActualizado }: ListaPedidosAdminProps) {
  const [avanzando, setAvanzando] = useState<PedidoResumen | null>(null)
  const [cancelando, setCancelando] = useState<PedidoResumen | null>(null)
  const [formulario, setFormulario] = useState({ nota: '', transportista: '', numero_guia: '' })
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const cerrar = useCallback(() => {
    setAvanzando(null)
    setCancelando(null)
    setError('')
  }, [])

  const abrirAvance = (pedido: PedidoResumen) => {
    setError('')
    setFormulario({
      nota: '',
      transportista: pedido.envios?.transportista ?? '',
      numero_guia: pedido.envios?.numero_guia ?? '',
    })
    setAvanzando(pedido)
  }

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setProcesando(true)
    setError('')
    try {
      await accion()
      cerrar()
      onActualizado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  const siguiente = avanzando ? siguienteEstado(avanzando.estado) : null

  return (
    <>
      <ul className="flex flex-col gap-3">
        {pedidos.map((pedido) => {
          const proximo = siguienteEstado(pedido.estado)
          const esperaPago = pedido.metodo_pago !== 'contra_entrega' && pedido.estado_pago !== 'verificado'
          return (
            <li key={pedido.id} className={`${claseTarjeta} p-4`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link href={`/pedidos/${pedido.id}`} className="text-[#22c55e] font-mono font-bold hover:underline">{pedido.codigo}</Link>
                  <p className="text-[#f0fdf4] text-sm break-words">{pedido.cliente?.nombre ?? 'Cliente'} · {pedido.telefono_contacto}</p>
                  <p className="text-[#86efac] text-xs">{fechaHora(pedido.created_at)} · {pedido.zonas_envio?.nombre} · {ETIQUETA_METODO[pedido.metodo_pago]}</p>
                  {pedido.envios?.transportista && <p className="text-[#86efac] text-xs">Flota: {pedido.envios.transportista} · Guía: {pedido.envios.numero_guia}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
                  <Insignia info={INFO_ESTADO_PAGO[pedido.estado_pago]} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
                <span className="text-[#f0fdf4] font-bold">{formatoBs(pedido.total)}</span>
                <div className="flex gap-2 flex-wrap">
                  {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado') && (
                    <button onClick={() => { setError(''); setCancelando(pedido) }} className={`${claseBotonPeligro} !px-3 !py-2 text-sm`}>Cancelar</button>
                  )}
                  {proximo && (esperaPago && proximo !== 'entregado' ? (
                    <span className="text-[#f59e0b] text-sm self-center">Esperando pago</span>
                  ) : (
                    <button onClick={() => abrirAvance(pedido)} className={`${claseBotonPrimario} !px-3 !py-2 text-sm`}>
                      Pasar a {INFO_ESTADO_PEDIDO[proximo].etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {avanzando && siguiente && (
        <Modal titulo={`${avanzando.codigo}: pasar a ${INFO_ESTADO_PEDIDO[siguiente].etiqueta}`} bloqueado={procesando} onCerrar={cerrar}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={error} />
            {siguiente === 'despachado' && (
              <>
                <div>
                  <label htmlFor="transportista" className={claseEtiqueta}>Empresa de flota{avanzando.zonas_envio?.tipo === 'provincia' ? ' (obligatorio)' : ''}</label>
                  <input id="transportista" maxLength={100} value={formulario.transportista} onChange={(e) => setFormulario((f) => ({ ...f, transportista: e.target.value }))} className={claseInput} />
                </div>
                <div>
                  <label htmlFor="guia" className={claseEtiqueta}>Número de guía{avanzando.zonas_envio?.tipo === 'provincia' ? ' (obligatorio)' : ''}</label>
                  <input id="guia" maxLength={60} value={formulario.numero_guia} onChange={(e) => setFormulario((f) => ({ ...f, numero_guia: e.target.value }))} className={claseInput} />
                </div>
              </>
            )}
            <div>
              <label htmlFor="nota" className={claseEtiqueta}>Nota para el seguimiento (opcional)</label>
              <input id="nota" maxLength={300} value={formulario.nota} onChange={(e) => setFormulario((f) => ({ ...f, nota: e.target.value }))} className={claseInput} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button disabled={procesando} onClick={cerrar} className={claseBotonSecundario}>Volver</button>
              <button
                disabled={procesando}
                onClick={() => void ejecutar(() => enviarJson(`/api/pedidos/${avanzando.id}/estado`, 'PATCH', {
                  estado: siguiente,
                  nota: formulario.nota.trim() || null,
                  transportista: formulario.transportista.trim() || null,
                  numero_guia: formulario.numero_guia.trim() || null,
                }))}
                className={claseBotonPrimario}
              >
                {procesando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cancelando && (
        <ModalConfirmacion
          titulo="Cancelar pedido"
          mensaje={`El pedido ${cancelando.codigo} se cancelará y sus productos volverán al inventario.`}
          textoConfirmar="Sí, cancelar"
          peligro
          procesando={procesando}
          error={error}
          onConfirmar={() => void ejecutar(() => enviarJson(`/api/pedidos/${cancelando.id}/cancelar`, 'POST', { motivo: 'Cancelado por la tienda' }))}
          onCancelar={cerrar}
        />
      )}
    </>
  )
}
