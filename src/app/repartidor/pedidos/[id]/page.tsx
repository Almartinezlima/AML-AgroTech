'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LuArrowLeft, LuBox, LuCircleCheck, LuMapPin, LuStore } from 'react-icons/lu'
import ContactoCliente from '@/components/entrega/ContactoCliente'
import FormularioEntrega from '@/components/entrega/FormularioEntrega'
import { AvisoError, BloqueCarga, BloqueError } from '@/components/ui/Estados'
import Insignia from '@/components/ui/Insignia'
import { claseBoton, claseBotonPrimario, claseBotonSecundario, clasePagina, claseTarjeta, claseTituloSeccion } from '@/components/ui/estilos'
import { enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { cantidadConUnidad } from '@/lib/abastecimiento/presentacion'
import { INFO_ESTADO_PEDIDO, diaHora } from '@/lib/ecommerce/presentacion'
import { formatoBs } from '@/lib/utils'
import type { DetalleEntrega } from '@/types/entrega'

// Entregar un pedido a domicilio (fase 9D; 9F repartidor externo): a dónde va, contacto,
// productos, "Recogí el pedido" en la tienda y la entrega con el código del cliente.
export default function EntregarPedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { datos: pedido, cargando, error, estadoError, recargar } = useDatosApi<DetalleEntrega>(`/api/entregas/${id}`)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [entregado, setEntregado] = useState(false)

  const envoltura = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="mx-auto max-w-xl">{contenido}</div></div>
  )
  const volver = <Link href="/repartidor" className={claseBotonSecundario}>Volver a mis entregas</Link>

  if (entregado) {
    return envoltura(
      <div className={`${claseTarjeta} flex flex-col items-center gap-4 p-8 text-center`}>
        <LuCircleCheck className="h-14 w-14 text-acento" aria-hidden="true" />
        <h1 className="font-titulo text-2xl font-bold text-texto">¡Entregado!</h1>
        <p className="text-texto">{pedido?.codigo} quedó registrado con tu nombre, la hora y quién recibió.{pedido ? ` Ganaste ${formatoBs(pedido.ganas)}: lo ves en «Por cobrar».` : ''}</p>
        <Link href="/repartidor" className={`${claseBotonPrimario} w-full min-h-14 text-lg`}>Volver a mis entregas</Link>
      </div>
    )
  }

  if (cargando && !pedido) return envoltura(<BloqueCarga filas={3} alto="h-40" />)
  if (error || !pedido) {
    if (estadoError === 400 || estadoError === 404) {
      return envoltura(<BloqueError titulo="Este pedido no está para entregar" mensaje="Puede que ya se haya entregado o que la tienda la haya liberado.">{volver}</BloqueError>)
    }
    return envoltura(<BloqueError mensaje={error || 'No se pudo cargar el pedido.'} onReintentar={() => void recargar()}>{volver}</BloqueError>)
  }

  const tomar = async () => {
    setProcesando(true)
    setErrorAccion('')
    try {
      await enviarJson(`/api/entregas/${pedido.id}/tomar`, 'POST', {})
      await recargar()
    } catch (causa) {
      setErrorAccion(mensajeDeError(causa))
    } finally {
      setProcesando(false)
    }
  }

  return envoltura(
    <>
      <Link href="/repartidor" className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-acento hover:underline">
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Mis entregas
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-titulo text-3xl font-bold tracking-tight text-texto">{pedido.codigo}</h1>
          <p className="text-texto-2">
            {pedido.despachado_en ? `Saliste a las ${diaHora(pedido.despachado_en)}` : 'Recógelo en la tienda'} · Ganas {formatoBs(pedido.ganas)}
          </p>
        </div>
        <Insignia info={pedido.estado === 'empacado' ? { etiqueta: 'Recoger en tienda', color: INFO_ESTADO_PEDIDO.empacado.color } : INFO_ESTADO_PEDIDO[pedido.estado]} />
      </header>

      <div className="flex flex-col gap-4">
        <AvisoError mensaje={errorAccion} />

        <section className={`${claseTarjeta} flex flex-col gap-3 p-4 sm:p-5`}>
          <div className="flex items-start gap-2 text-texto">
            <LuMapPin className="mt-1 h-5 w-5 shrink-0 text-acento" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold break-words">{pedido.zona ?? '—'}</p>
              {pedido.direccion_entrega && <p className="break-words">{pedido.direccion_entrega}</p>}
              {pedido.notas && <p className="mt-1 text-sm text-texto-2 break-words">Nota: {pedido.notas}</p>}
            </div>
          </div>
          <p className="text-texto"><span className="text-texto-2">Cliente:</span> <span className="font-semibold">{pedido.cliente ?? '—'}</span></p>
          <ContactoCliente telefono={pedido.telefono} codigoPedido={pedido.codigo} />
        </section>

        <section className={`${claseTarjeta} p-4 sm:p-5`}>
          <h2 className={`${claseTituloSeccion} mb-2 flex items-center gap-2`}>
            <LuBox className="h-5 w-5 text-acento" aria-hidden="true" /> {pedido.bultos ?? '—'} {pedido.bultos === 1 ? 'bulto' : 'bultos'}
          </h2>
          <ul className="flex flex-col gap-1 text-texto">
            {pedido.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="min-w-0 break-words">{item.nombre_producto}</span>
                <span className="whitespace-nowrap tabular-nums text-texto-2">{cantidadConUnidad(item.cantidad, item.unidad)}</span>
              </li>
            ))}
          </ul>
        </section>

        {pedido.estado === 'empacado' ? (
          <button type="button" disabled={procesando} onClick={() => void tomar()} className={`${claseBoton('primario')} w-full min-h-14 text-lg`}>
            <LuStore className="h-5 w-5" aria-hidden="true" /> {procesando ? 'Guardando…' : 'Recogí el pedido'}
          </button>
        ) : (
          <FormularioEntrega detalle={pedido} onCambio={() => void recargar()} onEntregado={() => setEntregado(true)} />
        )}
      </div>
    </>
  )
}
