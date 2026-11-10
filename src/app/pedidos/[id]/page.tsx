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
import { INFO_ESTADO_ENVIO, INFO_ESTADO_PEDIDO, fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { PedidoDetalle } from '@/types/comercio'
import BloquePago from './_components/BloquePago'
import LineaTiempo from './_components/LineaTiempo'

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
  const puedeCancelar = esDueno && pedido.estado === 'pendiente'

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
      <Link href="/pedidos" className="text-[#22c55e] hover:text-[#16a34a] text-sm">← Mis pedidos</Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#22c55e] font-mono">{pedido.codigo}</h1>
          <p className="text-[#86efac] text-sm">{fechaHora(pedido.created_at)}</p>
          {pedido.cliente && <p className="text-[#f0fdf4] text-sm mt-1">Cliente: {pedido.cliente.nombre}</p>}
        </div>
        <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <section className={`${claseTarjeta} p-5`}>
            <h2 className="text-[#f0fdf4] font-bold mb-4">Productos</h2>
            <ul className="flex flex-col gap-2">
              {pedido.pedido_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-[#86efac] min-w-0 break-words">{item.nombre_producto} × {item.cantidad}</span>
                  <span className="text-[#f0fdf4] whitespace-nowrap">{formatoBs(item.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#1a2e1a] mt-4 pt-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-[#86efac]">Subtotal</span><span className="text-[#f0fdf4]">{formatoBs(pedido.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-[#86efac]">Envío</span><span className="text-[#f0fdf4]">{formatoBs(pedido.costo_envio)}</span></div>
              <div className="flex justify-between font-bold text-lg mt-1"><span className="text-[#f0fdf4]">Total</span><span className="text-[#22c55e]">{formatoBs(pedido.total)}</span></div>
            </div>
          </section>

          <BloquePago pedido={pedido} esDueno={esDueno} onActualizado={() => void recargar()} />
        </div>

        <div className="flex flex-col gap-5">
          <section className={`${claseTarjeta} p-5`}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h2 className="text-[#f0fdf4] font-bold">Envío</h2>
              {pedido.envios && <Insignia info={INFO_ESTADO_ENVIO[pedido.envios.estado]} />}
            </div>
            <dl className="text-sm flex flex-col gap-1">
              <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Zona</dt><dd className="text-[#f0fdf4] text-right">{pedido.zonas_envio?.nombre}</dd></div>
              {pedido.direccion_entrega && <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Dirección</dt><dd className="text-[#f0fdf4] text-right min-w-0 break-words">{pedido.direccion_entrega}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Teléfono</dt><dd className="text-[#f0fdf4]">{pedido.telefono_contacto}</dd></div>
              {pedido.envios?.transportista && <div className="flex justify-between gap-3"><dt className="text-[#86efac]">Flota</dt><dd className="text-[#f0fdf4] text-right">{pedido.envios.transportista}</dd></div>}
              {pedido.envios?.numero_guia && <div className="flex justify-between gap-3"><dt className="text-[#86efac]">N.º de guía</dt><dd className="text-[#f0fdf4] font-mono">{pedido.envios.numero_guia}</dd></div>}
            </dl>
            {NUMERO_WHATSAPP && (
              <a
                href={`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(`Hola, consulto por mi pedido ${pedido.codigo}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center bg-[#162016] border border-[#22c55e] text-[#22c55e] font-semibold py-3 rounded-xl hover:bg-[#1a2e1a] transition-colors"
              >
                💬 Coordinar por WhatsApp
              </a>
            )}
          </section>

          <section className={`${claseTarjeta} p-5`}>
            <h2 className="text-[#f0fdf4] font-bold mb-4">Seguimiento</h2>
            <LineaTiempo eventos={pedido.seguimiento_pedido} />
          </section>

          {puedeCancelar && (
            <button onClick={() => { setErrorCancelar(''); setCancelando(true) }} className={claseBotonPeligro}>Cancelar pedido</button>
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
