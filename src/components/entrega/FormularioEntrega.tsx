'use client'
import { useState } from 'react'
import { Aviso, AvisoError } from '@/components/ui/Estados'
import { claseAyuda, claseBoton, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { ErrorPedidoApi, enviarJson, mensajeDeError } from '@/lib/api/cliente'
import type { DetalleEntrega, ResultadoEntrega } from '@/types/entrega'
import { LuKeyRound, LuLock } from 'react-icons/lu'

// Botones grandes: cómodos en la calle, con el celular en una mano (56 px)
const BOTON_GRANDE = `${claseBoton('primario')} w-full min-h-14 text-lg`

interface FormularioEntregaProps {
  detalle: DetalleEntrega
  // "en tienda" (el admin, recojo) o "a domicilio" (repartidor)
  enTienda?: boolean
  // Código bloqueado: hay que volver a leer el detalle
  onCambio: () => void
  // Entregado: el pedido ya no está para entregar
  onEntregado: () => void
}

// Entrega con prueba (fase 9D): el código de 4 dígitos que tiene el cliente + quién recibe.
// Con 5 códigos incorrectos se bloquea. Desde la 9F todo está pagado con QR: no se cobra nada.
export default function FormularioEntrega({ detalle, enTienda = false, onCambio, onEntregado }: FormularioEntregaProps) {
  const [codigo, setCodigo] = useState('')
  // Fase 9G: viene escrito con el nombre del cliente (si recibe otra persona, se cambia)
  const [nombre, setNombre] = useState(detalle.cliente ?? '')
  const [ci, setCi] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [entregado, setEntregado] = useState(false)

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
    return <Aviso tipo="ok">Entregado · registrado con tu nombre y hora.</Aviso>
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

      {/* El código del cliente */}
      <section className={`${claseTarjeta} p-4 sm:p-5`}>
        <h2 className={`${claseTituloSeccion} flex items-center gap-2`}>
          <LuKeyRound className="h-5 w-5 text-acento" aria-hidden="true" />
          Código de entrega
        </h2>
        <p className="mt-1 text-sm text-texto-2">Ya está pagado con QR: no cobres nada.</p>
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
      </section>
    </div>
  )
}
