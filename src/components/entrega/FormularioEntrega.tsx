'use client'
import { useState } from 'react'
import { Aviso, AvisoError } from '@/components/ui/Estados'
import { claseAyuda, claseBoton, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { ErrorPedidoApi, enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { formatoBs } from '@/lib/utils'
import type { DetalleEntrega, ResultadoEntrega } from '@/types/entrega'
import { LuBanknote, LuCircleCheck, LuKeyRound, LuLock } from 'react-icons/lu'

// Botones grandes: cómodos en la calle, con el celular en una mano (56 px)
const BOTON_GRANDE = `${claseBoton('primario')} w-full min-h-14 text-lg`

interface FormularioEntregaProps {
  detalle: DetalleEntrega
  // "en tienda" (almacén o admin, recojo) o "a domicilio" (repartidor)
  enTienda?: boolean
  // Cobro registrado o código bloqueado: hay que volver a leer el detalle
  onCambio: () => void
  // Entregado: el pedido ya no está para entregar
  onEntregado: () => void
}

// Entrega con prueba (fase 9D): 1) contra entrega, el cobro (igual al total); 2) el código de
// 4 dígitos que tiene el cliente + quién recibe. Con 5 códigos incorrectos se bloquea.
export default function FormularioEntrega({ detalle, enTienda = false, onCambio, onEntregado }: FormularioEntregaProps) {
  const [monto, setMonto] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [ci, setCi] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [entregado, setEntregado] = useState(false)

  const faltaCobro = detalle.metodo_pago === 'contra_entrega' && !detalle.cobrado

  const cobrar = async () => {
    const valor = Number(monto.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) return setError('Escribe cuánto recibiste.')
    if (Math.round(valor * 100) !== Math.round(Number(detalle.total) * 100)) {
      return setError(`El monto no coincide con el total del pedido (${formatoBs(detalle.total)}).`)
    }
    setProcesando(true)
    setError('')
    try {
      await enviarJson(`/api/entregas/${detalle.id}/cobro`, 'POST', { monto: valor })
      onCambio()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  const entregar = async () => {
    if (!/^[0-9]{4}$/.test(codigo)) return setError('El código son 4 números. Pídeselo al cliente.')
    if (nombre.trim().length < 3) return setError('Escribe el nombre de quien recibe.')
    // En tienda se pide también el CI de quien recoge
    if (enTienda && ci.trim().length < 4) return setError('Escribe el CI de quien recoge.')
    setProcesando(true)
    setError('')
    try {
      await enviarJson<ResultadoEntrega>(`/api/entregas/${detalle.id}/entregar`, 'POST', {
        codigo,
        nombre: nombre.trim(),
        ci: ci.trim() || null,
      })
      setEntregado(true)
      onEntregado()
    } catch (causa) {
      setError(mensajeDeError(causa))
      setCodigo('')
      // Bloqueado: se recarga para mostrar el estado
      if (causa instanceof ErrorPedidoApi && causa.codigo === 'CODIGO_BLOQUEADO') onCambio()
    } finally {
      setProcesando(false)
    }
  }

  if (entregado) {
    return <Aviso tipo="ok">Entrega registrada. Queda en la línea de tiempo con tu nombre y la hora.</Aviso>
  }

  if (detalle.codigo_bloqueado) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-estado-pendiente bg-estado-pendiente/10 p-4 text-estado-pendiente-texto">
        <LuLock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">Código bloqueado</span> tras 5 intentos fallidos. No entregues el pedido:
          avisa a la tienda para que lo revise con el cliente y lo desbloquee.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AvisoError mensaje={error} />

      {/* Paso 1: el cobro en efectivo */}
      <section className={`${claseTarjeta} p-4 sm:p-5`}>
        <h2 className={`${claseTituloSeccion} flex items-center gap-2`}>
          <LuBanknote className="h-5 w-5 text-acento" aria-hidden="true" />
          {detalle.metodo_pago === 'contra_entrega' ? '1. Cobro en efectivo' : 'Pago'}
        </h2>
        {detalle.metodo_pago !== 'contra_entrega' ? (
          <p className="mt-2 text-texto">Ya está pagado. No cobres nada.</p>
        ) : detalle.cobrado ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-texto">
            <LuCircleCheck className="h-5 w-5 text-acento" aria-hidden="true" />
            Cobrado {formatoBs(detalle.total)}{detalle.cobrado_por ? ` por ${detalle.cobrado_por}` : ''}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-texto">Cobra en efectivo:</p>
            <p className="font-titulo text-4xl font-bold tabular-nums text-acento">{formatoBs(detalle.total)}</p>
            <div>
              <label htmlFor="monto" className={claseEtiqueta}>Monto recibido (Bs.)</label>
              <input
                id="monto"
                inputMode="decimal"
                autoComplete="off"
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
                className={`${claseInput} text-2xl tabular-nums`}
                placeholder={String(detalle.total)}
              />
              <p className={claseAyuda}>Tiene que ser igual al total. El efectivo lo rindes a la tienda.</p>
            </div>
            <button type="button" disabled={procesando} onClick={() => void cobrar()} className={BOTON_GRANDE}>
              {procesando ? 'Guardando…' : 'Registrar cobro'}
            </button>
          </div>
        )}
      </section>

      {/* Paso 2: el código del cliente */}
      <section className={`${claseTarjeta} p-4 sm:p-5 ${faltaCobro ? 'opacity-60' : ''}`}>
        <h2 className={`${claseTituloSeccion} flex items-center gap-2`}>
          <LuKeyRound className="h-5 w-5 text-acento" aria-hidden="true" />
          {detalle.metodo_pago === 'contra_entrega' ? '2. Código de entrega' : 'Código de entrega'}
        </h2>
        {faltaCobro ? (
          <p className="mt-2 text-texto-2">Primero registra el cobro.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            <p className="text-texto">Pídele al cliente su código de 4 números (lo ve en «Mis pedidos»). Pídelo con el pedido ya en sus manos.</p>
            <div>
              <label htmlFor="codigo" className={claseEtiqueta}>Código del cliente</label>
              <input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`${claseInput} text-center font-titulo text-4xl font-bold tabular-nums tracking-[0.5em] pl-[0.5em]`}
                placeholder="••••"
              />
              {detalle.intentos_restantes !== null && detalle.intentos_restantes < 5 && (
                <p className={`${claseAyuda} text-estado-pendiente-texto`}>Quedan {detalle.intentos_restantes} intentos antes de que se bloquee.</p>
              )}
            </div>
            <div>
              <label htmlFor="recibe" className={claseEtiqueta}>{enTienda ? 'Nombre de quien recoge' : 'Nombre de quien recibe'}</label>
              <input id="recibe" maxLength={120} autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} className={claseInput} />
            </div>
            <div>
              <label htmlFor="ci" className={claseEtiqueta}>{enTienda ? 'CI de quien recoge' : 'CI (opcional)'}</label>
              <input id="ci" maxLength={20} autoComplete="off" value={ci} onChange={(e) => setCi(e.target.value)} className={claseInput} />
            </div>
            <button type="button" disabled={procesando} onClick={() => void entregar()} className={BOTON_GRANDE}>
              {procesando ? 'Revisando…' : enTienda ? 'Entregar en tienda' : 'Entregar'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
