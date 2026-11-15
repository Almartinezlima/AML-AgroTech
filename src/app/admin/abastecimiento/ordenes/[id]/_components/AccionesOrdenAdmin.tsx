'use client'
import { useState } from 'react'
import { LuBan, LuMessageCircle, LuPackageCheck, LuSend } from 'react-icons/lu'
import ModalMotivo from '@/components/abastecimiento/ModalMotivo'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBoton, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { numeroWhatsApp, textoWhatsAppOrden } from '@/lib/abastecimiento/ordenes'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { formatoBs } from '@/lib/utils'
import type { OrdenCompraAdmin } from '@/types/abastecimiento'
import ModalRecepcion from './ModalRecepcion'

type Abierto = 'enviar' | 'cancelar' | 'recibir' | null

// Lo que el admin puede hacer según el estado de la orden
export default function AccionesOrdenAdmin({ orden, onCambio }: { orden: OrdenCompraAdmin; onCambio: () => void }) {
  const [abierto, setAbierto] = useState<Abierto>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const cerrar = () => { setAbierto(null); setError('') }
  const hecho = () => { setAbierto(null); onCambio() }

  const enviar = async () => {
    setProcesando(true)
    setError('')
    try {
      await enviarJson(`/api/ordenes-compra/${orden.id}/enviar`, 'POST', {})
      hecho()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  const cancelable = ['borrador', 'enviada', 'aceptada'].includes(orden.estado)
  const conProductos = orden.lineas.some((l) => l.cantidad > 0)
  const numero = numeroWhatsApp(orden.distribuidor?.telefono)
  const whatsapp = `https://wa.me/${numero ?? ''}?text=${encodeURIComponent(textoWhatsAppOrden(orden, window.location.origin))}`

  if (!cancelable && orden.estado !== 'despachada') return null

  return (
    <section className={`${claseTarjeta} flex flex-col gap-3 p-4 sm:p-5`}>
      <h2 className={claseTituloSeccion}>Acciones</h2>
      <div className="flex flex-col gap-2">
        {orden.estado === 'borrador' && (
          <button type="button" onClick={() => setAbierto('enviar')} disabled={!conProductos} className={claseBoton('primario')}>
            <LuSend className="h-4 w-4" aria-hidden="true" /> Enviar al proveedor
          </button>
        )}
        {(orden.estado === 'enviada' || orden.estado === 'aceptada') && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={claseBoton(orden.estado === 'enviada' ? 'primario' : 'suave')}>
            <LuMessageCircle className="h-4 w-4" aria-hidden="true" /> Avisar por WhatsApp
          </a>
        )}
        {orden.estado === 'despachada' && (
          <button type="button" onClick={() => setAbierto('recibir')} className={claseBoton('primario')}>
            <LuPackageCheck className="h-4 w-4" aria-hidden="true" /> Registrar recepción
          </button>
        )}
        {cancelable && (
          <button type="button" onClick={() => setAbierto('cancelar')} className={claseBoton('peligro')}>
            <LuBan className="h-4 w-4" aria-hidden="true" /> Cancelar orden
          </button>
        )}
      </div>
      {orden.estado === 'despachada' && <p className="text-sm text-texto-2">Una orden despachada ya no se cancela: si no llega nada, regístralo en la recepción.</p>}

      {abierto === 'enviar' && (
        <ModalConfirmacion
          titulo={`Enviar ${orden.codigo}`}
          mensaje={`Se envía a ${orden.distribuidor?.nombre_comercial ?? 'el proveedor'} por ${formatoBs(orden.total)} con los precios de hoy, que quedan fijos en la orden. Después avísale por WhatsApp.`}
          textoConfirmar="Enviar orden"
          procesando={procesando}
          error={error}
          onConfirmar={() => void enviar()}
          onCancelar={cerrar}
        />
      )}
      {abierto === 'cancelar' && (
        <ModalMotivo
          titulo={`Cancelar ${orden.codigo}`}
          explicacion="La orden queda cancelada y el proveedor ve el motivo. No se puede deshacer."
          textoConfirmar="Cancelar orden"
          url={`/api/ordenes-compra/${orden.id}/cancelar`}
          onCerrar={cerrar}
          onHecho={hecho}
        />
      )}
      {abierto === 'recibir' && <ModalRecepcion orden={orden} onCerrar={cerrar} onHecho={hecho} />}
    </section>
  )
}
