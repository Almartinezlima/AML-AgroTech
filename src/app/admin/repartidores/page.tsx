'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { LuBike, LuHandCoins, LuReceipt, LuRotateCcw, LuTruck, LuUserPlus } from 'react-icons/lu'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import { BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBoton, claseEnlace, clasePagina, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_ESTADO_PEDIDO, diaHora, fechaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { DeudaRepartidor, DeudasRepartidores, PedidoReparto } from '@/types/entrega'

type Accion = { tipo: 'pagar'; repartidor: DeudaRepartidor } | { tipo: 'liberar'; entrega: PedidoReparto } | null

const VERDE = '#22c55e'
const GRIS = '#94a3b8'

// Repartidores externos (fase 9F): entregas a domicilio en curso (con "Liberar entrega" si el
// repartidor no aparece), cuánto se debe a cada uno y "Pagado" (queda quién y cuándo).
export default function AdminRepartidoresPage() {
  const deudas = useDatosApi<DeudasRepartidores>('/api/repartidores')
  const entregas = useDatosApi<PedidoReparto[]>('/api/entregas')
  const [accion, setAccion] = useState<Accion>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cerrar = useCallback(() => { setAccion(null); setErrorAccion('') }, [])

  const ejecutar = async () => {
    if (!accion) return
    setProcesando(true)
    setErrorAccion('')
    try {
      if (accion.tipo === 'pagar') {
        await enviarJson(`/api/repartidores/${accion.repartidor.id}/pagar`, 'POST', { monto: Number(accion.repartidor.por_pagar) })
      } else {
        await enviarJson(`/api/entregas/${accion.entrega.id}/liberar`, 'POST', {})
      }
      setAccion(null)
      await Promise.all([deudas.recargar(), entregas.recargar()])
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
      // Si el monto cambió, se recarga para mostrar el nuevo
      if (accion.tipo === 'pagar') void deudas.recargar()
    } finally {
      setProcesando(false)
    }
  }

  const repartidores = deudas.datos?.repartidores ?? []
  const totalDeuda = repartidores.reduce((suma, r) => suma + Number(r.por_pagar), 0)
  const disponibles = repartidores.filter((r) => r.disponible && r.activo && r.es_repartidor).length
  const sinRepartidor = (entregas.datos ?? []).filter((e) => e.estado === 'empacado' && !e.repartidor).length

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-5xl">
        <EncabezadoAdmin
          titulo="Repartidores"
          descripcion="Entregas a domicilio en curso, lo que se debe a cada repartidor y los pagos hechos. Los repartidores se registran como clientes y les das el rol en Usuarios."
          acciones={<Link href="/admin/usuarios" className={claseBoton('secundario', 'chico')}><LuUserPlus className="h-4 w-4" aria-hidden="true" /> Asignar rol</Link>}
        />

        {deudas.cargando && !deudas.datos ? <BloqueCarga />
          : deudas.error || !deudas.datos ? <BloqueError mensaje={deudas.error} onReintentar={() => void deudas.recargar()} />
          : (
            <TarjetasResumen etiqueta="Resumen de repartidores" cifras={[
              { titulo: 'Por pagar', valor: formatoBs(totalDeuda), detalle: 'Envíos entregados sin pagar', icono: LuHandCoins, tono: totalDeuda > 0 ? 'pendiente' : 'neutro', ancha: true },
              { titulo: 'Disponibles', valor: String(disponibles), detalle: `De ${repartidores.filter((r) => r.es_repartidor && r.activo).length} repartidores`, icono: LuBike, tono: 'acento' },
              { titulo: 'Sin repartidor', valor: entregas.datos ? String(sinRepartidor) : '—', detalle: 'Listas para salir', icono: LuTruck, tono: sinRepartidor > 0 ? 'pendiente' : 'neutro' },
            ]} />
          )}

        {/* Entregas en curso */}
        <section aria-labelledby="titulo-curso" className="mb-8">
          <h2 id="titulo-curso" className={`${claseTituloSeccion} mb-3`}>Entregas en curso</h2>
          {entregas.cargando && !entregas.datos ? <BloqueCarga filas={2} />
            : entregas.error || !entregas.datos ? <BloqueError mensaje={entregas.error} onReintentar={() => void entregas.recargar()} />
            : entregas.datos.length === 0 ? <BloqueVacio icono={LuTruck} mensaje="No hay entregas a domicilio en curso" />
            : (
              <ul className="flex flex-col gap-3">
                {entregas.datos.map((e) => {
                  const enCamino = e.estado === 'despachado'
                  const situacion = enCamino
                    ? { etiqueta: 'En camino', color: INFO_ESTADO_PEDIDO.despachado.color }
                    : e.repartidor ? { etiqueta: 'Aceptada', color: VERDE } : { etiqueta: 'Esperando repartidor', color: INFO_ESTADO_PEDIDO.pendiente.color }
                  return (
                    <li key={e.id} className={`${claseTarjeta} flex flex-col gap-2 p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/pedidos/${e.id}`} className={`${claseEnlace} font-titulo text-lg`}>{e.codigo}</Link>
                          <p className="break-words text-texto">{e.zona ?? '—'}{e.direccion_entrega ? ` · ${e.direccion_entrega}` : ''}</p>
                        </div>
                        <Insignia info={situacion} />
                      </div>
                      <p className="text-sm text-texto-2">
                        {e.repartidor
                          ? `${e.repartidor} · ${enCamino && e.despachado_en ? `salió ${diaHora(e.despachado_en)}` : e.aceptado_en ? `aceptó ${diaHora(e.aceptado_en)}` : ''}`
                          : `Lista desde ${e.empacado_en ? diaHora(e.empacado_en) : '—'} · se avisó al grupo de Telegram`}
                        {' · '}Gana {formatoBs(e.ganas)}{e.bultos ? ` · ${e.bultos} ${e.bultos === 1 ? 'bulto' : 'bultos'}` : ''}
                      </p>
                      {e.codigo_bloqueado && <p className="text-sm font-semibold text-estado-pendiente-texto">Código bloqueado: desbloquéalo en el detalle del pedido.</p>}
                      {!enCamino && e.repartidor && (
                        <button type="button" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'liberar', entrega: e }) }} className={`${claseBoton('peligro', 'chico')} self-start`}>
                          <LuRotateCcw className="h-4 w-4" aria-hidden="true" /> Liberar entrega
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
        </section>

        {/* Lo que se debe a cada repartidor */}
        {deudas.datos && (
          <section aria-labelledby="titulo-deudas" className="mb-8">
            <h2 id="titulo-deudas" className={`${claseTituloSeccion} mb-3`}>Lo que se debe</h2>
            {repartidores.length === 0 ? (
              <BloqueVacio icono={LuBike} mensaje="Todavía no hay repartidores. Pide que se registren y dales el rol en Usuarios." />
            ) : (
              <ul className="flex flex-col gap-3">
                {repartidores.map((r) => (
                  <li key={r.id} className={`${claseTarjeta} flex flex-wrap items-center justify-between gap-3 p-4`}>
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-texto">{r.nombre}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-texto-2">
                        <Insignia info={!r.es_repartidor || !r.activo
                          ? { etiqueta: r.activo ? 'Ya no es repartidor' : 'Cuenta desactivada', color: GRIS }
                          : r.disponible ? { etiqueta: 'Disponible', color: VERDE } : { etiqueta: 'No disponible', color: GRIS }} />
                        {r.telefono && <span>{r.telefono}</span>}
                        {r.en_curso > 0 && <span>· {r.en_curso} en curso</span>}
                      </div>
                      <p className="mt-1 text-sm text-texto-2">
                        Pagado en total {formatoBs(r.total_pagado)}{r.ultimo_pago_en ? ` · último pago ${fechaHora(r.ultimo_pago_en)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <p className="font-titulo text-2xl font-bold tabular-nums text-texto">{formatoBs(r.por_pagar)}</p>
                        <p className="text-sm text-texto-2">{r.entregas_por_pagar} {r.entregas_por_pagar === 1 ? 'entrega' : 'entregas'} sin pagar</p>
                      </div>
                      {Number(r.por_pagar) > 0 && (
                        <button type="button" onClick={() => { setErrorAccion(''); setAccion({ tipo: 'pagar', repartidor: r }) }} className={claseBoton('primario', 'chico')}>
                          Pagado
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Historial de pagos */}
        {deudas.datos && deudas.datos.pagos.length > 0 && (
          <section aria-labelledby="titulo-pagos">
            <h2 id="titulo-pagos" className={`${claseTituloSeccion} mb-3`}>Últimos pagos</h2>
            <ul className={`${claseTarjeta} divide-y divide-borde`}>
              {deudas.datos.pagos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="inline-flex min-w-0 items-center gap-2 text-texto">
                    <LuReceipt className="h-4 w-4 shrink-0 text-texto-2" aria-hidden="true" />
                    <span className="break-words">{p.repartidor ?? '—'} · {p.entregas} {p.entregas === 1 ? 'entrega' : 'entregas'}</span>
                  </span>
                  <span className="text-sm text-texto-2">
                    <span className="font-semibold tabular-nums text-texto">{formatoBs(p.monto)}</span> · pagó {p.pagado_por ?? '—'} · {fechaHora(p.pagado_en)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {accion?.tipo === 'pagar' && (
        <ModalConfirmacion
          titulo={`Pagar a ${accion.repartidor.nombre}`}
          mensaje={`Confirmas que le pagaste ${formatoBs(accion.repartidor.por_pagar)} por ${accion.repartidor.entregas_por_pagar} ${accion.repartidor.entregas_por_pagar === 1 ? 'entrega' : 'entregas'}. Queda registrado con tu nombre y la hora.`}
          textoConfirmar="Sí, ya le pagué"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void ejecutar()}
          onCancelar={cerrar}
        />
      )}
      {accion?.tipo === 'liberar' && (
        <ModalConfirmacion
          titulo={`Liberar ${accion.entrega.codigo}`}
          mensaje={`${accion.entrega.repartidor ?? 'El repartidor'} ya no la lleva. La entrega vuelve a estar disponible y se avisa otra vez al grupo de repartidores.`}
          textoConfirmar="Sí, liberar"
          peligro
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void ejecutar()}
          onCancelar={cerrar}
        />
      )}
    </div>
  )
}
