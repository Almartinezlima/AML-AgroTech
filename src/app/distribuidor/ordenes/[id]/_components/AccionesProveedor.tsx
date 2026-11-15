'use client'
import { useState } from 'react'
import { LuCalendarCheck, LuTruck, LuX } from 'react-icons/lu'
import ModalMotivo from '@/components/abastecimiento/ModalMotivo'
import { AvisoError } from '@/components/ui/Estados'
import { claseBoton, claseEtiqueta, claseInput, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { fechaHoyLocal } from '@/lib/utils'
import type { OrdenCompraDetalle } from '@/types/abastecimiento'

// Aceptar (con fecha), despachar (transportista y guía) o rechazar (con motivo)
export default function AccionesProveedor({ orden, onCambio }: { orden: OrdenCompraDetalle; onCambio: () => void }) {
  const [fecha, setFecha] = useState('')
  const [despacho, setDespacho] = useState({ transportista: '', guia: '' })
  const [rechazando, setRechazando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  if (orden.estado !== 'enviada' && orden.estado !== 'aceptada') return null

  const accion = async (ruta: 'aceptar' | 'despachar', cuerpo: unknown) => {
    setGuardando(true)
    setError('')
    try {
      await enviarJson(`/api/ordenes-compra/${orden.id}/${ruta}`, 'POST', cuerpo)
      onCambio()
    } catch (causa) {
      setError(mensajeDeError(causa))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className={`${claseTarjeta} flex flex-col gap-4 p-4 sm:p-5`}>
      <h2 className={claseTituloSeccion}>{orden.estado === 'enviada' ? 'Responder la orden' : 'Despachar la orden'}</h2>
      <AvisoError mensaje={error} />

      {orden.estado === 'enviada' ? (
        <form onSubmit={(e) => { e.preventDefault(); void accion('aceptar', { fecha_estimada: fecha }) }} className="flex flex-col gap-3">
          <div>
            <label htmlFor="fecha-entrega" className={claseEtiqueta}>¿Qué día la entregas?</label>
            <input id="fecha-entrega" type="date" required min={fechaHoyLocal()} value={fecha} onChange={(e) => setFecha(e.target.value)} className={claseInput} />
          </div>
          <button type="submit" disabled={guardando || !fecha} className={claseBoton('primario')}>
            <LuCalendarCheck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Aceptar orden'}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void accion('despachar', despacho) }} className="flex flex-col gap-3">
          <div>
            <label htmlFor="transportista" className={claseEtiqueta}>Transportista</label>
            <input id="transportista" required minLength={2} maxLength={80} value={despacho.transportista}
              onChange={(e) => setDespacho((d) => ({ ...d, transportista: e.target.value }))} className={claseInput} placeholder="Ej.: Trans Copacabana" />
          </div>
          <div>
            <label htmlFor="guia" className={claseEtiqueta}>Número de guía</label>
            <input id="guia" required maxLength={60} value={despacho.guia}
              onChange={(e) => setDespacho((d) => ({ ...d, guia: e.target.value }))} className={claseInput} />
          </div>
          <button type="submit" disabled={guardando || despacho.transportista.trim().length < 2 || !despacho.guia.trim()} className={claseBoton('primario')}>
            <LuTruck className="h-4 w-4" aria-hidden="true" /> {guardando ? 'Guardando…' : 'Despachar'}
          </button>
        </form>
      )}

      <button type="button" onClick={() => setRechazando(true)} className={claseBoton('peligro')}>
        <LuX className="h-4 w-4" aria-hidden="true" /> Rechazar orden
      </button>

      {rechazando && (
        <ModalMotivo
          titulo={`Rechazar ${orden.codigo}`}
          explicacion="La tienda ve el motivo. No se puede deshacer."
          textoConfirmar="Rechazar orden"
          url={`/api/ordenes-compra/${orden.id}/rechazar`}
          onCerrar={() => setRechazando(false)}
          onHecho={() => { setRechazando(false); onCambio() }}
        />
      )}
    </section>
  )
}
