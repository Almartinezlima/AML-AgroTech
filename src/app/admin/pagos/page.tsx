'use client'
import { useCallback, useState } from 'react'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import TarjetasResumen from '@/components/admin/TarjetasResumen'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import Modal from '@/components/ui/Modal'
import ModalConfirmacion from '@/components/ui/ModalConfirmacion'
import { claseBotonPeligro, claseBotonSecundario, claseEtiqueta, claseFilaFiltros, claseFiltro, claseInput, clasePagina } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { INFO_ESTADO_PAGO } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import { ESTADOS_PAGO, type EstadoPago, type PagoAdmin } from '@/types/comercio'
import { LuCreditCard, LuReceipt, LuWallet } from 'react-icons/lu'
import TarjetaPago from './_components/TarjetaPago'

// Filtros por estado del pago: "Todos" y cada estado
const OPCIONES_FILTRO: Array<{ valor: EstadoPago | ''; texto: string }> = [
  { valor: '', texto: 'Todos' },
  ...ESTADOS_PAGO.map((e) => ({ valor: e, texto: INFO_ESTADO_PAGO[e].etiqueta })),
]

export default function AdminPagosPage() {
  const [estado, setEstado] = useState<EstadoPago | ''>('en_revision')
  const url = `/api/pagos${estado ? `?estado=${estado}` : ''}`
  const { datos, cargando, error, recargar } = useDatosApi<PagoAdmin[]>(url)
  const [aprobando, setAprobando] = useState<PagoAdmin | null>(null)
  const [rechazando, setRechazando] = useState<PagoAdmin | null>(null)
  const [reembolsando, setReembolsando] = useState<PagoAdmin | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cerrar = useCallback(() => {
    setAprobando(null)
    setRechazando(null)
    setReembolsando(null)
    setMotivo('')
    setErrorAccion('')
  }, [])

  const verificar = async (pago: PagoAdmin, aprobado: boolean) => {
    if (!aprobado && !motivo.trim()) return setErrorAccion('Indica el motivo del rechazo.')

    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/pagos/${pago.id}/verificar`, 'PATCH', { aprobado, motivo: aprobado ? null : motivo.trim() })
      cerrar()
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  // El dinero ya se devolvió al cliente (migración 0006)
  const marcarReembolsado = async (pago: PagoAdmin) => {
    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/pagos/${pago.id}/reembolso`, 'POST', { nota: null })
      cerrar()
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  // Cifras de la lista que se ve (solo suma lo ya cargado)
  const lista = datos ?? []
  const monto = lista.reduce((suma, p) => suma + Number(p.monto), 0)
  const conComprobante = lista.filter((p) => p.comprobante_url).length
  const textoFiltro = estado ? INFO_ESTADO_PAGO[estado].etiqueta.toLowerCase() : 'todos los estados'

  return (
    <div className={clasePagina}>
      <div className="max-w-5xl mx-auto">
        <EncabezadoAdmin
          titulo="Pagos"
          descripcion="Revisa los comprobantes, aprueba o rechaza, y marca los reembolsos."
        />

        <div role="group" aria-label="Filtrar por estado del pago" className={`${claseFilaFiltros} mb-5`}>
          {OPCIONES_FILTRO.map((o) => (
            <button key={o.valor || 'todos'} onClick={() => setEstado(o.valor)} aria-pressed={estado === o.valor} className={claseFiltro(estado === o.valor)}>
              {o.texto}
            </button>
          ))}
        </div>

        {cargando ? (
          <BloqueCarga />
        ) : error || !datos ? (
          <BloqueError mensaje={error} onReintentar={() => void recargar()} />
        ) : (
          <>
            <TarjetasResumen etiqueta={`Resumen de pagos: ${textoFiltro}`} cifras={[
              { titulo: 'Pagos', valor: String(lista.length), detalle: `En ${textoFiltro}`, icono: LuCreditCard, tono: 'acento' },
              { titulo: 'Con comprobante', valor: String(conComprobante), detalle: 'Foto o captura subida', icono: LuReceipt },
              { titulo: 'Monto', valor: formatoBs(monto), detalle: 'Suma de la lista', icono: LuWallet, tono: 'acento', ancha: true },
            ]} />

            {datos.length === 0 ? (
              <BloqueVacio icono={LuCreditCard} mensaje="No hay pagos con ese estado" />
            ) : (
              <ul className="flex flex-col gap-3">
                {datos.map((pago) => (
                  <TarjetaPago
                    key={pago.id}
                    pago={pago}
                    onAprobar={() => { setErrorAccion(''); setAprobando(pago) }}
                    onRechazar={() => { setErrorAccion(''); setRechazando(pago) }}
                    onReembolsar={() => { setErrorAccion(''); setReembolsando(pago) }}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {aprobando && (
        <ModalConfirmacion
          titulo="Aprobar pago"
          mensaje={`Confirmas haber recibido ${formatoBs(aprobando.monto)} del pedido ${aprobando.pedidos?.codigo ?? ''}. El pedido pasará a confirmado.`}
          textoConfirmar="Aprobar"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void verificar(aprobando, true)}
          onCancelar={cerrar}
        />
      )}

      {reembolsando && (
        <ModalConfirmacion
          titulo="Marcar como reembolsado"
          mensaje={`Confirmas que devolviste ${formatoBs(reembolsando.monto)} al cliente del pedido ${reembolsando.pedidos?.codigo ?? ''}.`}
          textoConfirmar="Sí, ya lo devolví"
          procesando={procesando}
          error={errorAccion}
          onConfirmar={() => void marcarReembolsado(reembolsando)}
          onCancelar={cerrar}
        />
      )}

      {rechazando && (
        <Modal titulo={`Rechazar pago de ${rechazando.pedidos?.codigo ?? ''}`} bloqueado={procesando} onCerrar={cerrar}>
          <div className="flex flex-col gap-4">
            <AvisoError mensaje={errorAccion} />
            <div>
              <label htmlFor="motivo" className={claseEtiqueta}>Motivo (lo verá el cliente)</label>
              <textarea id="motivo" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${claseInput} resize-none`} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button disabled={procesando} onClick={cerrar} className={claseBotonSecundario}>Volver</button>
              <button disabled={procesando} onClick={() => void verificar(rechazando, false)} className={claseBotonPeligro}>
                {procesando ? 'Guardando…' : 'Rechazar pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
