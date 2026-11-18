'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Aviso, AvisoError, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import { claseAyuda, claseBoton, claseBotonPrimario, claseBotonSecundario, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { diaHora } from '@/lib/ecommerce/presentacion'
import type { DetalleEntrega } from '@/types/entrega'
import FormularioEntrega from './FormularioEntrega'
import { LuLockOpen, LuRotateCcw, LuTruck } from 'react-icons/lu'

interface PanelEntregaProps {
  pedidoId: string
  esAdmin: boolean
  onActualizado: () => void
}

type Accion = 'desbloquear' | 'flota' | 'liberar' | null

// Entrega desde el detalle del pedido o "Por preparar" (admin, fase 9D y 9F):
// recojo → "Entregar en tienda" con el código; a domicilio → lo lleva el repartidor que acepta
// (el admin puede liberarla si no aparece); por flota → el admin confirma con una nota.
// El admin desbloquea un código bloqueado.
export default function PanelEntrega({ pedidoId, esAdmin, onActualizado }: PanelEntregaProps) {
  const { datos: detalle, cargando, error, recargar } = useDatosApi<DetalleEntrega>(`/api/entregas/${pedidoId}`)
  const [accion, setAccion] = useState<Accion>(null)
  const [nota, setNota] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [entregado, setEntregado] = useState(false)

  const actualizar = () => {
    void recargar()
    onActualizado()
  }

  const abrir = (nueva: Accion) => {
    setNota('')
    setErrorAccion('')
    setAccion(nueva)
  }

  const guardar = async () => {
    if (accion !== 'liberar' && nota.trim().length < 3) return setErrorAccion('Escribe una nota (al menos 3 letras).')
    setProcesando(true)
    setErrorAccion('')
    try {
      if (accion === 'liberar') await enviarJson(`/api/entregas/${pedidoId}/liberar`, 'POST', {})
      else if (accion === 'desbloquear') await enviarJson(`/api/entregas/${pedidoId}/desbloquear`, 'POST', { nota: nota.trim() })
      else await enviarJson(`/api/pedidos/${pedidoId}/recibido`, 'POST', { nota: nota.trim() })
      setAccion(null)
      actualizar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  if (entregado) {
    return <Aviso tipo="ok">Entrega registrada con tu nombre y la hora. El pedido ya no está por entregar.</Aviso>
  }
  if (cargando && !detalle) return <BloqueCarga filas={1} alto="h-32" />
  if (error || !detalle) return <BloqueError mensaje={error || 'No se pudo cargar la entrega.'} onReintentar={() => void recargar()} />

  const enTienda = detalle.tipo_zona === 'recojo' && detalle.estado === 'listo_para_recoger'
  const porFlota = detalle.tipo_zona === 'provincia' && detalle.estado === 'despachado'

  return (
    <section className={`${claseTarjeta} flex flex-col gap-4 p-5`}>
      <h2 className={claseTituloSeccion}>{enTienda ? 'Entregar en tienda' : 'Entrega'}</h2>

      {detalle.codigo_bloqueado && esAdmin && (
        <div className="flex flex-col gap-2 rounded-2xl border border-estado-pendiente bg-estado-pendiente/10 p-4">
          <p className="text-sm text-estado-pendiente-texto">
            <span className="font-semibold">Código bloqueado</span> tras 5 intentos fallidos. Revisa con el cliente antes de desbloquear.
          </p>
          <button type="button" onClick={() => abrir('desbloquear')} className={`${claseBoton('primario', 'chico')} self-start`}>
            <LuLockOpen className="h-4 w-4" aria-hidden="true" /> Desbloquear código
          </button>
        </div>
      )}

      {enTienda && (
        <>
          <p className="text-texto">El cliente te dice su código de 4 números cuando ya tiene el pedido en la mano. Tú no lo ves: es su prueba de entrega.</p>
          <FormularioEntrega detalle={detalle} enTienda onCambio={actualizar} onEntregado={() => { setEntregado(true); onActualizado() }} />
        </>
      )}

      {detalle.tipo_zona === 'urbano' && (
        <div className="flex flex-col gap-3">
          <p className="text-texto">
            {detalle.estado === 'despachado'
              ? `En camino con ${detalle.despachado_por ?? 'el repartidor'}${detalle.despachado_en ? ` desde las ${diaHora(detalle.despachado_en)}` : ''}. Lo entrega con el código del cliente.`
              : detalle.repartidor
                ? `${detalle.repartidor} aceptó la entrega${detalle.aceptado_en ? ` a las ${diaHora(detalle.aceptado_en)}` : ''}: pasa a recogerlo a la tienda.`
                : 'Esperando que un repartidor acepte la entrega (se avisó al grupo de Telegram).'}
          </p>
          <div className="flex flex-wrap gap-2">
            {esAdmin && detalle.estado === 'empacado' && detalle.repartidor && (
              <button type="button" onClick={() => abrir('liberar')} className={claseBoton('peligro', 'chico')}>
                <LuRotateCcw className="h-4 w-4" aria-hidden="true" /> Liberar entrega
              </button>
            )}
            <Link href="/admin/repartidores" className={claseBoton('secundario', 'chico')}>
              <LuTruck className="h-4 w-4" aria-hidden="true" /> Ver reparto
            </Link>
          </div>
        </div>
      )}

      {porFlota && esAdmin && (
        <div className="flex flex-col gap-3">
          <p className="text-texto">Va en la flota. Lo confirma el cliente con «Recibí mi pedido»; si te avisa por otro medio, confírmalo con una nota.</p>
          <button type="button" onClick={() => abrir('flota')} className={`${claseBoton('primario', 'chico')} self-start`}>Confirmar entrega en la flota</button>
        </div>
      )}

      {accion === 'liberar' && (
        <Modal titulo="Liberar entrega" bloqueado={procesando} onCerrar={() => setAccion(null)}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={errorAccion} />
            <p className="text-texto">
              {detalle.repartidor ?? 'El repartidor'} ya no la lleva. La entrega vuelve a estar disponible y se avisa otra vez al grupo de repartidores.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={procesando} onClick={() => setAccion(null)} className={claseBotonSecundario}>Volver</button>
              <button type="button" disabled={procesando} onClick={() => void guardar()} className={claseBoton('peligro')}>
                {procesando ? 'Liberando…' : 'Sí, liberar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {accion && accion !== 'liberar' && (
        <Modal titulo={accion === 'desbloquear' ? 'Desbloquear código de entrega' : 'Confirmar entrega en la flota'} bloqueado={procesando} onCerrar={() => setAccion(null)}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={errorAccion} />
            <div>
              <label htmlFor="nota-entrega" className={claseEtiqueta}>{accion === 'desbloquear' ? '¿Por qué se desbloquea?' : '¿Cómo se confirmó la entrega?'}</label>
              <textarea id="nota-entrega" rows={3} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} className={`${claseInput} resize-none`}
                placeholder={accion === 'desbloquear' ? 'Ej.: hablé con el cliente, se equivocó al dictar el código' : 'Ej.: el cliente avisó por WhatsApp que lo recogió en la terminal'} />
              <p className={claseAyuda}>Queda en la línea de tiempo con tu nombre y la hora.</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={procesando} onClick={() => setAccion(null)} className={claseBotonSecundario}>Volver</button>
              <button type="button" disabled={procesando} onClick={() => void guardar()} className={claseBotonPrimario}>
                {procesando ? 'Guardando…' : accion === 'desbloquear' ? 'Desbloquear' : 'Confirmar entrega'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
