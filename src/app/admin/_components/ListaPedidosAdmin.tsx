'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { AvisoError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import Modal from '@/components/ui/Modal'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBoton, claseBotonPrimario, claseBotonSecundario, claseEnlace, claseEtiqueta, claseInput, claseTarjeta, claseTextoPendiente } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { ESTADOS_ALMACEN, ETIQUETA_METODO, INFO_ESTADO_PAGO, INFO_ESTADO_PEDIDO, fechaHora, puedeCancelarAdmin, siguienteEstado } from '@/lib/ecommerce/presentacion'
import { nombreArchivoNota, situacionNota } from '@/lib/ecommerce/notaVenta'
import { formatoBs } from '@/lib/utils'
import type { PedidoResumen } from '@/types/comercio'
import { LuFileDown, LuHandshake, LuHourglass, LuPackageCheck, LuTruck } from 'react-icons/lu'

// Un dato del pedido: "Entrega: Distrito Pucara"
function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt className="shrink-0 text-texto-2">{titulo}:</dt>
      <dd className="min-w-0 break-words text-texto">{children}</dd>
    </div>
  )
}

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

  const siguiente = avanzando ? siguienteEstado(avanzando.estado, avanzando.zonas_envio?.tipo) : null

  return (
    <>
      <ul className="flex flex-col gap-3">
        {pedidos.map((pedido) => {
          const proximo = siguienteEstado(pedido.estado, pedido.zonas_envio?.tipo)
          const esperaPago = pedido.metodo_pago !== 'contra_entrega' && pedido.estado_pago !== 'verificado'
          const tipoZona = pedido.zonas_envio?.tipo
          return (
            <li key={pedido.id} className={claseTarjeta}>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 p-4 pb-2">
                <div className="min-w-0">
                  <Link href={`/pedidos/${pedido.id}`} className={`${claseEnlace} font-titulo text-lg`}>{pedido.codigo}</Link>
                  <p className="text-texto font-medium break-words">{pedido.cliente?.nombre ?? 'Cliente'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
                  <Insignia info={INFO_ESTADO_PAGO[pedido.estado_pago]} />
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 pb-3 text-sm sm:grid-cols-2">
                <Dato titulo="Fecha">{fechaHora(pedido.created_at)}</Dato>
                <Dato titulo="Teléfono">{pedido.telefono_contacto}</Dato>
                <Dato titulo="Entrega">{pedido.zonas_envio?.nombre}</Dato>
                <Dato titulo="Pago">{ETIQUETA_METODO[pedido.metodo_pago]}</Dato>
                {pedido.recoge_nombre && <Dato titulo="Recoge">{pedido.recoge_nombre} · CI {pedido.recoge_ci}</Dato>}
                {pedido.envios?.transportista && <Dato titulo="Flota">{pedido.envios.transportista} · Guía {pedido.envios.numero_guia}</Dato>}
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-borde bg-tarjeta-hover/40 px-4 py-3">
                <span className="font-titulo text-xl font-bold tabular-nums text-texto">{formatoBs(pedido.total)}</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Nota de venta (fase 7). Los cancelados se ven en el detalle: allí se sabe si se llegaron a confirmar */}
                  {situacionNota(pedido) === 'disponible' && (
                    <a href={`/api/pedidos/${pedido.id}/nota`} download={nombreArchivoNota(pedido.codigo)} className={claseBoton('secundario', 'chico')}>
                      <LuFileDown className="h-4 w-4" aria-hidden="true" /> Nota PDF
                    </a>
                  )}
                  {puedeCancelarAdmin(pedido.estado) && (
                    <button onClick={() => { setError(''); setCancelando(pedido) }} className={claseBoton('peligro', 'chico')}>Cancelar</button>
                  )}
                  {/* Preparar y empacar se hace en el panel de almacén (fase 9C) */}
                  {ESTADOS_ALMACEN.includes(pedido.estado) && (
                    <Link href={`/almacen/pedidos/${pedido.id}`} className={claseBoton('primario', 'chico')}>
                      <LuPackageCheck className="h-4 w-4" aria-hidden="true" /> Ver en almacén
                    </Link>
                  )}
                  {/* A domicilio lo despacha y lo entrega el repartidor con el código (fase 9D) */}
                  {tipoZona === 'urbano' && (pedido.estado === 'empacado' || pedido.estado === 'despachado') && (
                    <Link href={pedido.estado === 'empacado' ? '/repartidor' : `/repartidor/pedidos/${pedido.id}`} className={claseBoton('secundario', 'chico')}>
                      <LuTruck className="h-4 w-4" aria-hidden="true" /> Ver en reparto
                    </Link>
                  )}
                  {/* En tienda (con el código) o por flota (con nota): desde el detalle del pedido */}
                  {(pedido.estado === 'listo_para_recoger' || (pedido.estado === 'despachado' && tipoZona === 'provincia')) && (
                    <Link href={`/pedidos/${pedido.id}`} className={claseBoton('primario', 'chico')}>
                      <LuHandshake className="h-4 w-4" aria-hidden="true" /> Registrar entrega
                    </Link>
                  )}
                  {proximo && (esperaPago ? (
                    <span className={`${claseTextoPendiente} inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold`}>
                      <LuHourglass className="h-4 w-4" aria-hidden="true" /> Esperando pago
                    </span>
                  ) : (
                    <button onClick={() => abrirAvance(pedido)} className={claseBoton('primario', 'chico')}>
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
                  <label htmlFor="transportista" className={claseEtiqueta}>Empresa de flota (obligatorio)</label>
                  <input id="transportista" maxLength={100} value={formulario.transportista} onChange={(e) => setFormulario((f) => ({ ...f, transportista: e.target.value }))} className={claseInput} />
                </div>
                <div>
                  <label htmlFor="guia" className={claseEtiqueta}>Número de guía (obligatorio)</label>
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
                {procesando ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cancelando && (
        <ModalConfirmacion
          titulo="Cancelar pedido"
          mensaje={`El pedido ${cancelando.codigo} se cancelará y sus productos volverán al inventario${cancelando.estado === 'preparando' || cancelando.estado === 'empacado' ? ' (avisa al almacén para que deshaga la caja)' : ''}.`}
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
