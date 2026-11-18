'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { Aviso, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseBotonPeligro, claseBotonSecundario, clasePagina, claseTarjeta } from '@/components/ui/estilos'
import { useAuth } from '@/context/AuthContext'
import { ErrorPedidoApi, enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { ESTADOS_EN_ENTREGA, INFO_ESTADO_ENVIO, estadoCliente, fechaHora, puedeCancelarCliente } from '@/lib/ecommerce/presentacion'
import CodigoEntrega from '@/components/entrega/CodigoEntrega'
import PanelEntrega from '@/components/entrega/PanelEntrega'
import { formatoBs } from '@/lib/utils'
import type { PedidoDetalle } from '@/types/comercio'
import BloquePago from './_components/BloquePago'
import BotonNota from './_components/BotonNota'
import CierrePedido from './_components/CierrePedido'
import FaltantesAdmin from './_components/FaltantesAdmin'
import LineaTiempo from './_components/LineaTiempo'
import { LuArrowLeft, LuMessageCircle } from 'react-icons/lu'

const NUMERO_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_TIENDA

export default function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { user, perfil } = useAuth()
  const { datos: pedido, cargando, error, estadoError, recargar } = useDatosApi<PedidoDetalle>(`/api/pedidos/${id}`)
  const [cancelando, setCancelando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState('')
  const [cancelado, setCancelado] = useState(false)

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="max-w-4xl mx-auto">{contenido}</div></div>
  )

  if (cargando && !pedido) return envoltura(<BloqueCarga filas={3} alto="h-40" />)
  if (error || !pedido) {
    const verPedidos = <Link href="/pedidos" className={claseBotonSecundario}>Ver mis pedidos</Link>
    // Id mal escrito o pedido ajeno: no tiene sentido reintentar
    if (estadoError === 400 || estadoError === 404) {
      return envoltura(<BloqueError titulo="No encontramos ese pedido" mensaje="Puede que el enlace esté incompleto. Busca tu compra en «Mis pedidos».">{verPedidos}</BloqueError>)
    }
    return envoltura(<BloqueError mensaje={error || 'No encontramos el pedido.'} onReintentar={() => void recargar()}>{verPedidos}</BloqueError>)
  }

  const esDueno = user?.id === pedido.usuario_id
  const esAdmin = perfil?.rol === 'admin'
  // Si ya mandó el comprobante, la cancelación la hace la tienda (y genera el reembolso)
  const puedeCancelar = esDueno && puedeCancelarCliente(pedido.estado, pedido.estado_pago, pedido.metodo_pago)
  const estado = estadoCliente({
    estado: pedido.estado,
    estado_pago: pedido.estado_pago,
    metodo_pago: pedido.metodo_pago,
    tipoZona: pedido.zonas_envio?.tipo,
    monto: pedido.total,
  })

  const confirmarCancelacion = async () => {
    setProcesando(true)
    setErrorCancelar('')
    try {
      await enviarJson(`/api/pedidos/${pedido.id}/cancelar`, 'POST', {})
      setCancelando(false)
      setCancelado(true)
      await recargar()
    } catch (causa) {
      setErrorCancelar(causa instanceof ErrorPedidoApi && causa.codigo === 'ESTADO_NO_PERMITIDO'
        ? 'Este pedido ya no se puede cancelar desde aquí porque la tienda ya lo está atendiendo. Comunícate con la tienda.'
        : mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return envoltura(
    <>
      <Link href="/pedidos" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-acento hover:text-acento-hover">
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a mis pedidos
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mt-2 mb-4">
        <div>
          <h1 className="font-titulo text-2xl font-bold tracking-tight text-acento">{pedido.codigo}</h1>
          <p className="text-texto-2 text-sm">{fechaHora(pedido.created_at)}</p>
          {pedido.cliente && <p className="text-texto text-sm mt-1">Cliente: {pedido.cliente.nombre}</p>}
        </div>
        <Insignia info={estado} />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {cancelado && <Aviso tipo="ok">Cancelaste el pedido {pedido.codigo}.</Aviso>}
        <p className="rounded-2xl border border-borde bg-tarjeta-hover px-4 py-3 text-texto">
          <span className="font-semibold">Qué sigue: </span>{estado.queSigue}
        </p>
        {/* Solo el dueño lo recibe de la API (fase 9D) */}
        {pedido.codigo_entrega && <CodigoEntrega codigo={pedido.codigo_entrega} />}
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
                className={`${claseBoton('suave')} mt-4 w-full`}
              >
                <LuMessageCircle className="h-5 w-5" aria-hidden="true" /> Escribir a la tienda por WhatsApp
              </a>
            )}
          </section>

          {pedido.faltantes && pedido.faltantes.length > 0 && (
            <FaltantesAdmin pedidoId={pedido.id} faltantes={pedido.faltantes} onActualizado={() => void recargar()} />
          )}

          {esAdmin && ESTADOS_EN_ENTREGA.includes(pedido.estado) && (
            <PanelEntrega pedidoId={pedido.id} esAdmin onActualizado={() => void recargar()} />
          )}
          <CierrePedido pedido={pedido} esDueno={esDueno} onActualizado={() => void recargar()} />

          <section className={`${claseTarjeta} p-5`}>
            <h2 className="text-texto font-bold mb-4">Seguimiento</h2>
            <LineaTiempo eventos={pedido.seguimiento_pedido} />
          </section>

          <BotonNota pedido={pedido} />

          {puedeCancelar && (
            <button onClick={() => { setErrorCancelar(''); setCancelando(true) }} className={claseBotonPeligro}>Cancelar pedido</button>
          )}
          {esDueno && pedido.estado === 'pendiente' && !puedeCancelar && (
            <p className="rounded-2xl bg-tarjeta-hover px-4 py-3 text-sm text-texto">
              Ya enviaste tu comprobante (foto del pago), así que la cancelación la hace la tienda. Si necesitas cancelar, comunícate con la tienda{NUMERO_WHATSAPP ? ' por WhatsApp' : ''}: te devuelve lo que pagaste.
            </p>
          )}
        </div>
      </div>

      {cancelando && (
        <ModalConfirmacion
          titulo="¿Cancelar el pedido?"
          mensaje={`El pedido ${pedido.codigo} se cancelará y no se te cobrará nada. Esto no se puede deshacer.`}
          textoConfirmar="Sí, cancelar pedido"
          textoCancelar="No, volver"
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
