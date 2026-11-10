'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBotonPeligro, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { useAuth } from '@/context/AuthContext'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_ESTADO_ENVIO, INFO_ESTADO_PEDIDO, fechaHora, puedeCancelarCliente } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoDetalle } from '@/types/comercio'
import BloquePago from './_components/BloquePago'
import LineaTiempo from './_components/LineaTiempo'
import { LuMessageCircle } from 'react-icons/lu'

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_TIENDA

export default function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { datos: pedido, cargando, error, recargar } = useDatosApi<PedidoDetalle>(`/api/pedidos/${id}`)
  const [cancelando, setCancelando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState('')

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="max-w-4xl mx-auto">{contenido}</div></div>
  )

  if (cargando && !pedido) return envoltura(<BloqueCarga filas={3} alto="h-40" />)
  if (error || !pedido) return envoltura(<BloqueError mensaje={error || 'El pedido no existe.'} onReintentar={() => void recargar()} />)

  const esDueno = user?.id === pedido.usuario_id
  // Si ya mandó el comprobante, la cancelación la hace la tienda (y genera el reembolso)
  const puedeCancelar = esDueno && puedeCancelarCliente(pedido.estado, pedido.estado_pago)

  const confirmarCancelacion = async () => {
    setProcesando(true)
    setErrorCancelar('')
    try {
      await enviarJson(`/api/pedidos/${pedido.id}/cancelar`, 'POST', {})
      setCancelando(false)
      await recargar()
    } catch (causa) {
      setErrorCancelar(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return envoltura(
    <>
      <Link href="/pedidos" className="text-acento hover:text-acento-hover text-sm">← Mis pedidos</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-acento font-mono">{pedido.codigo}</h1>
          <p className="text-texto-2 text-sm">{fechaHora(pedido.created_at)}</p>
          {pedido.cliente && <p className="text-texto text-sm mt-1">Cliente: {pedido.cliente.nombre}</p>}
        </div>
        <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <section className={`${claseTarjeta} p-5`}>
            <h2 className="text-texto font-bold mb-4">Productos</h2>
            <ul className="flex flex-col gap-2">
              {pedido.pedido_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-texto-2 min-w-0 break-words">{item.nombre_producto} × {item.cantidad}</span>
                  <span className="text-texto whitespace-nowrap">{formatoBs(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-borde mt-4 pt-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-texto-2">Subtotal</span><span className="text-texto">{formatoBs(pedido.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-texto-2">Envío</span><span className="text-texto">{formatoBs(pedido.costo_envio)}</span></div>
              <div className="flex justify-between font-bold text-lg mt-1"><span className="text-texto">Total</span><span className="text-acento">{formatoBs(pedido.total)}</span></div>
            </div>
          </section>

          <BloquePago pedido={pedido} esDueno={esDueno} onActualizado={() => void recargar()} />
        </div>

        <div className="flex flex-col gap-5">
          <section className={`${claseTarjeta} p-5`}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className="text-texto font-bold">Envío</h2>
              {pedido.envios && <Insignia info={INFO_ESTADO_ENVIO[pedido.envios.estado]} />}
            </div>
            <dl className="text-sm flex flex-col gap-1">
              <div className="flex justify-between gap-3"><dt className="text-texto-2">Zona</dt><dd className="text-texto text-right">{pedido.zonas_envio?.nombre}</dd></div>
              {pedido.direccion_entrega && <div className="flex justify-between gap-3"><dt className="text-texto-2">Dirección</dt><dd className="text-texto text-right min-w-0 break-words">{pedido.direccion_entrega}</dd></div>}
              {pedido.recoge_nombre && <div className="flex justify-between gap-3"><dt className="text-texto-2">Recoge en la flota</dt><dd className="text-texto text-right min-w-0 break-words">{pedido.recoge_nombre} · CI {pedido.recoge_ci}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-texto-2">Teléfono</dt><dd className="text-texto">{pedido.telefono_contacto}</dd></div>
              {pedido.envios?.transportista && <div className="flex justify-between gap-3"><dt className="text-texto-2">Flota</dt><dd className="text-texto text-right">{pedido.envios.transportista}</dd></div>}
              {pedido.envios?.numero_guia && <div className="flex justify-between gap-3"><dt className="text-texto-2">N.º de guía</dt><dd className="text-texto font-mono">{pedido.envios.numero_guia}</dd></div>}
            </dl>
            {NUMERO_WHATSAPP && (
              <a
                href={`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(`Hola, consulto por mi pedido ${pedido.codigo}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center bg-tarjeta-hover border border-acento text-acento font-semibold py-3 rounded-xl hover:bg-borde transition-colors"
              >
                <LuMessageCircle className="inline h-5 w-5 mr-1.5 -mt-0.5" aria-hidden="true" /> Coordinar por WhatsApp
              </a>
            )}
          </section>

          <section className={`${claseTarjeta} p-5`}>
            <h2 className="text-texto font-bold mb-4">Seguimiento</h2>
            <LineaTiempo eventos={pedido.seguimiento_pedido} />
          </section>

          {puedeCancelar && (
            <button onClick={() => { setErrorCancelar(''); setCancelando(true) }} className={claseBotonPeligro}>Cancelar pedido</button>
          )}
          {esDueno && pedido.estado === 'pendiente' && !puedeCancelar && (
            <p className="rounded-2xl bg-tarjeta-hover px-4 py-3 text-sm text-texto">
              Ya enviaste tu comprobante. Si necesitas cancelar el pedido, escríbenos por WhatsApp y la tienda te devuelve el pago.
            </p>
          )}
        </div>
      </div>

      {cancelando && (
        <ModalConfirmacion
          titulo="Cancelar pedido"
          mensaje={`El pedido ${pedido.codigo} se cancelará y los productos volverán al inventario.`}
          textoConfirmar="Sí, cancelar"
          peligro
          procesando={procesando}
          error={errorCancelar}
          onConfirmar={() => void confirmarCancelacion()}
          onCancelar={() => setCancelando(false)}
        />
      )}
    </>
  )
}
