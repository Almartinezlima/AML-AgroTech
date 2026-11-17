'use client'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LuArrowLeft, LuCircleAlert, LuPackageCheck, LuPlay, LuPrinter } from 'react-icons/lu'
import ListaFaltantes from '@/components/almacen/ListaFaltantes'
import PanelEntrega from '@/components/entrega/PanelEntrega'
import { AvisoError, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseBotonPrimario, claseBotonSecundario, clasePagina, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { useAuth } from '@/context/AuthContext'
import { INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import type { DetallePreparacion, ItemPreparacion } from '@/types/almacen'
import DatosEntrega from './_components/DatosEntrega'
import ListaProductos from './_components/ListaProductos'
import ModalEmpacar from './_components/ModalEmpacar'
import ModalFaltante from './_components/ModalFaltante'

// Preparar un pedido: empezar, marcar cada producto al ponerlo en la caja, reportar
// faltantes y empacar. Cada paso queda con el nombre de quién lo hizo.
export default function PrepararPedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const { datos: pedido, cargando, error, estadoError, recargar, setDatos } = useDatosApi<DetallePreparacion>(`/api/almacen/pedidos/${id}`)
  const [modal, setModal] = useState<'faltante' | 'empacar' | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const cerrar = useCallback(() => setModal(null), [])
  const listo = useCallback(() => { setModal(null); void recargar() }, [recargar])

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="mx-auto max-w-3xl">{contenido}</div></div>
  )
  const volver = <Link href="/almacen" className={claseBotonSecundario}>Volver al almacén</Link>

  if (cargando && !pedido) return envoltura(<BloqueCarga filas={3} alto="h-32" />)
  if (error || !pedido) {
    if (estadoError === 400 || estadoError === 404) {
      return envoltura(<BloqueError titulo="Este pedido no está en el almacén" mensaje="Puede que ya haya salido o que se haya cancelado.">{volver}</BloqueError>)
    }
    return envoltura(<BloqueError mensaje={error || 'No se pudo cargar el pedido.'} onReintentar={() => void recargar()}>{volver}</BloqueError>)
  }

  const preparando = pedido.estado === 'preparando'
  const empacado = pedido.estado === 'empacado' || pedido.estado === 'listo_para_recoger'
  const sinMarcar = pedido.items.filter((i) => !i.marcado).length
  const faltantesAbiertos = pedido.faltantes.filter((f) => !f.resuelto_en).length
  const puedeEmpacar = preparando && sinMarcar === 0 && faltantesAbiertos === 0

  const empezar = async () => {
    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/almacen/pedidos/${pedido.id}/preparar`, 'POST', {})
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  // La casilla cambia al instante; si la base lo rechaza, vuelve atrás y se muestra el motivo
  const cambiarItem = async (item: ItemPreparacion, marcado: boolean) => {
    setGuardando(item.id)
    setErrorAccion('')
    setDatos((actual) => actual && ({ ...actual, items: actual.items.map((i) => (i.id === item.id ? { ...i, marcado } : i)) }))
    try {
      await enviarJson(`/api/almacen/items/${item.id}`, 'PATCH', { marcado })
      await recargar()
    } catch (causa) {
      setDatos((actual) => actual && ({ ...actual, items: actual.items.map((i) => (i.id === item.id ? item : i)) }))
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setGuardando(null)
    }
  }

  return envoltura(
    <>
      <Link href="/almacen" className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:underline">
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Almacén
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-titulo text-3xl font-bold tracking-tight text-texto">{pedido.codigo}</h1>
          <p className="text-texto-2">Pedido el {diaHora(pedido.created_at)}</p>
        </div>
        <Insignia info={INFO_ESTADO_PEDIDO[pedido.estado]} />
      </header>

      <div className="flex flex-col gap-5">
        <AvisoError mensaje={errorAccion} />

        <DatosEntrega pedido={pedido} />

        <section className={`${claseTarjeta} p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className={claseTituloSeccion}>Productos</h2>
            {preparando && <span className="text-sm font-semibold tabular-nums text-texto-2">{pedido.items.length - sinMarcar} de {pedido.items.length} en la caja</span>}
          </div>
          {pedido.preparacion_por && pedido.preparacion_en && (
            <p className="mb-3 text-sm text-texto-2">Preparación iniciada por {pedido.preparacion_por} · {diaHora(pedido.preparacion_en)}</p>
          )}
          <ListaProductos items={pedido.items} editable={preparando} guardando={guardando} onCambiar={(item, marcado) => void cambiarItem(item, marcado)} />
        </section>

        {pedido.faltantes.length > 0 && (
          <section className={`${claseTarjeta} p-5`}>
            <h2 className={`${claseTituloSeccion} mb-3`}>Faltantes</h2>
            <ListaFaltantes faltantes={pedido.faltantes} />
          </section>
        )}

        {pedido.estado === 'confirmado' && (
          <button type="button" onClick={() => void empezar()} disabled={procesando} className={`${claseBotonPrimario} w-full text-lg`}>
            <LuPlay className="h-5 w-5" aria-hidden="true" /> {procesando ? 'Empezando…' : 'Empezar a preparar'}
          </button>
        )}

        {preparando && (
          <div className="flex flex-col gap-3">
            {!puedeEmpacar && (
              <p className="inline-flex items-start gap-2 text-sm text-texto-2">
                <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {faltantesAbiertos > 0
                  ? 'Hay un faltante sin resolver: la tienda tiene que resolverlo antes de empacar.'
                  : `Marca ${sinMarcar === 1 ? 'el producto que falta' : `los ${sinMarcar} productos que faltan`} para poder empacar.`}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setModal('faltante')} className={claseBoton('peligro')}>Reportar faltante</button>
              <button type="button" onClick={() => setModal('empacar')} disabled={!puedeEmpacar} className={`${claseBotonPrimario} sm:min-w-48`}>
                <LuPackageCheck className="h-5 w-5" aria-hidden="true" /> Empacado
              </button>
            </div>
          </div>
        )}

        {empacado && (
          <section className={`${claseTarjeta} flex flex-col gap-3 p-5`}>
            <p className="text-texto">
              Empacado por <span className="font-semibold">{pedido.empacado_por ?? '—'}</span>
              {pedido.empacado_en ? ` · ${diaHora(pedido.empacado_en)}` : ''} · {pedido.bultos} {pedido.bultos === 1 ? 'bulto' : 'bultos'}.
              {' '}{pedido.estado === 'listo_para_recoger' ? 'Espera al cliente en la tienda.' : 'Listo para salir.'}
            </p>
            <Link href={`/almacen/pedidos/${pedido.id}/etiqueta`} className={`${claseBotonPrimario} w-full sm:w-auto sm:self-start`}>
              <LuPrinter className="h-5 w-5" aria-hidden="true" /> Imprimir {pedido.bultos === 1 ? 'etiqueta' : `${pedido.bultos} etiquetas`}
            </Link>
          </section>
        )}

        {/* Recojo: "Entregar en tienda" con el código del cliente (fase 9D) */}
        {pedido.estado === 'listo_para_recoger' && (
          <PanelEntrega pedidoId={pedido.id} esAdmin={perfil?.rol === 'admin'} onActualizado={() => undefined} />
        )}
      </div>

      {modal === 'faltante' && (
        <ModalFaltante pedidoId={pedido.id} codigo={pedido.codigo} items={pedido.items} onCerrar={cerrar} onReportado={listo} />
      )}
      {modal === 'empacar' && (
        <ModalEmpacar pedidoId={pedido.id} codigo={pedido.codigo} esRecojo={pedido.tipo_zona === 'recojo'} onCerrar={cerrar} onEmpacado={listo} />
      )}
    </>
  )
}
