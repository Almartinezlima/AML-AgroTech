'use client'
import { useState } from 'react'
import Estrellas from '@/components/entrega/Estrellas'
import { Aviso, AvisoError } from '@/components/ui/Estados'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseAyuda, claseBotonPrimario, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { diaHora, estaEntregado } from '@/lib/ecommerce/presentacion'
import type { PedidoDetalle } from '@/types/comercio'
import { LuPackageCheck } from 'react-icons/lu'

interface CierrePedidoProps {
  pedido: PedidoDetalle
  esDueno: boolean
  onActualizado: () => void
}

// Cierre del pedido (fase 9D): por flota "Recibí mi pedido"; ya entregado, "Recibí conforme"
// con 1 a 5 estrellas y un comentario corto. El admin ve la calificación.
export default function CierrePedido({ pedido, esDueno, onActualizado }: CierrePedidoProps) {
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [gracias, setGracias] = useState(false)

  const cierre = pedido.cierre
  const porFlota = pedido.zonas_envio?.tipo === 'provincia'
  const puedeConfirmarFlota = esDueno && porFlota && pedido.estado === 'despachado'
  const entregado = estaEntregado(pedido.estado)
  const calificacion = cierre?.calificacion ?? null

  // Sin la 0018 (cierre null) o sin nada que mostrar
  if (!cierre || (!puedeConfirmarFlota && !entregado)) return null

  const ejecutar = async (accion: () => Promise<unknown>, alTerminar?: () => void) => {
    setProcesando(true)
    setError('')
    try {
      await accion()
      alTerminar?.()
      onActualizado()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  const calificar = () => {
    if (estrellas < 1) return setError('Elige de 1 a 5 estrellas.')
    void ejecutar(
      () => enviarJson(`/api/pedidos/${pedido.id}/calificacion`, 'POST', { estrellas, comentario: comentario.trim() || null }),
      () => setGracias(true)
    )
  }

  return (
    <section className={`${claseTarjeta} flex flex-col gap-4 p-5`}>
      <h2 className={claseTituloSeccion}>{entregado ? 'Entrega' : 'Tu pedido en la flota'}</h2>

      {cierre.entregado_en && (
        <p className="inline-flex items-start gap-2 text-texto">
          <LuPackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
          <span>Entregado{cierre.recibe_nombre ? ` a ${cierre.recibe_nombre}` : ''} · {diaHora(cierre.entregado_en)}</span>
        </p>
      )}

      {puedeConfirmarFlota && (
        <>
          <p className="text-texto">Cuando recojas tu encomienda en la terminal, avísanos aquí.</p>
          <button type="button" onClick={() => { setError(''); setConfirmando(true) }} className={`${claseBotonPrimario} w-full`}>
            Recibí mi pedido
          </button>
        </>
      )}

      {entregado && calificacion && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-texto-2">{esDueno ? 'Tu calificación' : 'Calificación del cliente'}</p>
          <Estrellas valor={calificacion.estrellas} />
          {calificacion.comentario && <p className="text-texto break-words">«{calificacion.comentario}»</p>}
          {gracias && <Aviso tipo="ok">¡Gracias! Tu opinión nos ayuda a entregar mejor.</Aviso>}
        </div>
      )}

      {entregado && !calificacion && esDueno && (
        <div className="flex flex-col gap-3">
          <AvisoError mensaje={error} />
          <p className="text-texto font-semibold">¿Recibiste conforme? Califica la entrega</p>
          <Estrellas valor={estrellas} onElegir={setEstrellas} />
          <div>
            <label htmlFor="comentario" className={claseEtiqueta}>Comentario (opcional)</label>
            <textarea id="comentario" rows={2} maxLength={200} value={comentario} onChange={(e) => setComentario(e.target.value)}
              placeholder="Ej.: llegó a tiempo y en buen estado" className={`${claseInput} resize-none`} />
            <p className={claseAyuda}>{comentario.length} de 200</p>
          </div>
          <button type="button" disabled={procesando} onClick={calificar} className={`${claseBotonPrimario} w-full`}>
            {procesando ? 'Guardando…' : 'Recibí conforme'}
          </button>
        </div>
      )}

      {entregado && !calificacion && !esDueno && <p className="text-sm text-texto-2">El cliente todavía no calificó la entrega.</p>}

      {confirmando && (
        <ModalConfirmacion
          titulo="¿Ya recogiste tu pedido?"
          mensaje="Confírmalo solo si ya tienes tu encomienda en la mano. Queda registrado con la hora."
          textoConfirmar="Sí, lo recibí"
          textoCancelar="Todavía no"
          procesando={procesando}
          error={error}
          onConfirmar={() => void ejecutar(() => enviarJson(`/api/pedidos/${pedido.id}/recibido`, 'POST', {}), () => setConfirmando(false))}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </section>
  )
}
