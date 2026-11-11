'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuArrowLeft, LuCheck, LuShoppingCart } from 'react-icons/lu'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, clasePagina, claseTituloPagina } from '@/components/ui/estilos'
import { useAuth } from '@/context/AuthContext'
import { useCarrito } from '@/context/CarritoContext'
import { ErrorPedidoApi, enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { REGEX_CI, REGEX_TELEFONO } from '@/lib/ecommerce/reglas'
import type { Cotizacion, MetodoPago, PedidoCreado, ZonaEnvio } from '@/types/comercio'
import PasoEntrega, { type DatosEntrega } from './_components/PasoEntrega'
import PasoPago from './_components/PasoPago'
import PasoResumen from './_components/PasoResumen'
import { ResumenLateral, ResumenPlegable } from './_components/ResumenCompra'

const PASOS = ['Entrega', 'Pago', 'Resumen']
const ENTREGA_VACIA: DatosEntrega = { zonaId: '', direccion: '', recogeNombre: '', recogeCi: '', telefono: '', notas: '' }

export default function CheckoutPage() {
  const router = useRouter()
  const { perfil } = useAuth()
  const { items, ajustarStock, limpiarCarrito, listo } = useCarrito()
  const zonas = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')
  const [paso, setPaso] = useState(0)
  const [entrega, setEntrega] = useState<DatosEntrega>(ENTREGA_VACIA)
  const [metodo, setMetodo] = useState<MetodoPago | null>(null)
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  // Evita que se vea "carrito vacío" mientras se va a la pantalla de éxito
  const pedidoCreado = useRef(false)

  useEffect(() => {
    if (perfil?.telefono) setEntrega((d) => (d.telefono ? d : { ...d, telefono: perfil.telefono ?? '' }))
  }, [perfil])

  const zona = zonas.datos?.find((z) => z.id === entrega.zonaId)
  const lineas = items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad }))

  const cambiarEntrega = (cambios: Partial<DatosEntrega>) => {
    setEntrega((d) => ({ ...d, ...cambios }))
    // Una zona sin contra entrega invalida ese método; el resumen también cambia
    if (cambios.zonaId) { setMetodo(null); setCotizacion(null) }
  }

  // Si falta stock, ajusta el carrito y explica qué pasó
  const tratarError = (causa: unknown) => {
    if (causa instanceof ErrorPedidoApi && causa.codigo === 'STOCK_INSUFICIENTE') {
      const detalle = causa.detalle as { producto_id?: string; disponible?: number } | undefined
      if (detalle?.producto_id) ajustarStock(detalle.producto_id, detalle.disponible ?? 0)
      setPaso(0)
      setCotizacion(null)
      setError(`${causa.message} Ajustamos tu carrito.`)
      return
    }
    setError(mensajeDeError(causa))
  }

  const errorEntrega = () => {
    if (!zona) return 'Elige dónde recibir tu pedido.'
    if (zona.tipo === 'urbano' && !entrega.direccion.trim()) return 'Escribe la dirección de entrega.'
    if (zona.tipo === 'provincia') {
      if (entrega.recogeNombre.trim().length < 3) return 'Escribe el nombre de quien recoge la encomienda.'
      if (!REGEX_CI.test(entrega.recogeCi.trim())) return 'Escribe un CI válido de quien recoge (ej.: 1234567 o 1234567-1B).'
    }
    if (!REGEX_TELEFONO.test(entrega.telefono.trim())) return 'Escribe un teléfono válido.'
    return ''
  }

  const avanzar = async () => {
    setError('')
    if (paso === 0) {
      const problema = errorEntrega()
      return problema ? setError(problema) : setPaso(1)
    }
    if (!metodo) return setError('Elige cómo quieres pagar.')

    setProcesando(true)
    try {
      setCotizacion(await enviarJson<Cotizacion>('/api/pedidos/cotizar', 'POST', { items: lineas, zona_id: entrega.zonaId }))
      setPaso(2)
    } catch (causa) {
      tratarError(causa)
    } finally {
      setProcesando(false)
    }
  }

  const confirmar = async () => {
    if (!metodo || !zona) return
    setProcesando(true)
    setError('')
    try {
      const flota = zona.tipo === 'provincia'
      const pedido = await enviarJson<PedidoCreado>('/api/pedidos', 'POST', {
        items: lineas,
        zona_id: entrega.zonaId,
        direccion: zona.tipo === 'urbano' ? entrega.direccion.trim() : null,
        recoge_nombre: flota ? entrega.recogeNombre.trim() : null,
        recoge_ci: flota ? entrega.recogeCi.trim().toUpperCase() : null,
        telefono: entrega.telefono.trim(),
        metodo_pago: metodo,
        notas: entrega.notas.trim() || null,
      })
      pedidoCreado.current = true
      limpiarCarrito()
      router.replace(`/checkout/exito?id=${pedido.id}`)
    } catch (causa) {
      tratarError(causa)
      setProcesando(false)
    }
  }

  const contenedor = (contenido: React.ReactNode, ancho = 'max-w-2xl') => (
    <div className={clasePagina}><div className={`${ancho} mx-auto`}>{contenido}</div></div>
  )

  if (pedidoCreado.current || !listo) return contenedor(<BloqueCarga filas={2} />)
  if (items.length === 0) {
    return contenedor(
      <BloqueVacio icono={LuShoppingCart} mensaje="Tu carrito está vacío">
        <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
      </BloqueVacio>
    )
  }
  if (zonas.cargando) return contenedor(<BloqueCarga filas={5} />)
  if (zonas.error || !zonas.datos) return contenedor(<BloqueError mensaje={zonas.error} onReintentar={() => void zonas.recargar()} />)

  const resumen = { items, zona, totalServidor: paso === 2 ? cotizacion?.total : undefined }

  return contenedor(
    <>
      <h1 className={`${claseTituloPagina} mb-6`}>Finalizar compra</h1>

      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Pasos de la compra">
        {PASOS.map((nombre, i) => {
          const hecho = i < paso
          const clase = `flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition ${
            i === paso ? 'bg-acento text-white' : hecho ? 'bg-acento/10 text-acento hover:bg-acento/20' : 'bg-tarjeta text-texto-2 border border-borde'
          }`
          return (
            <li key={nombre} aria-current={i === paso ? 'step' : undefined}>
              {hecho ? (
                <button type="button" onClick={() => { setError(''); setPaso(i) }} className={clase} aria-label={`Volver al paso ${i + 1}: ${nombre}`}>
                  <LuCheck className="h-4 w-4" aria-hidden="true" /> {nombre}
                </button>
              ) : (
                <span className={clase}>{i + 1}. {nombre}</span>
              )}
            </li>
          )
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ResumenPlegable {...resumen} />
          <AvisoError mensaje={error} />

          {paso === 0 && <PasoEntrega zonas={zonas.datos} datos={entrega} onCambiar={cambiarEntrega} />}
          {paso === 1 && zona && <PasoPago zona={zona} metodo={metodo} onCambiar={setMetodo} />}
          {paso === 2 && zona && metodo && cotizacion && (
            <PasoResumen cotizacion={cotizacion} zona={zona} entrega={entrega} metodo={metodo} />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {paso > 0 ? (
              <button disabled={procesando} onClick={() => { setError(''); setPaso(paso - 1) }} className={claseBotonSecundario}>
                <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
              </button>
            ) : (
              <Link href="/carrito" className={claseBotonSecundario}><LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al carrito</Link>
            )}
            {paso < 2 ? (
              <button disabled={procesando} onClick={() => void avanzar()} className={claseBotonPrimario}>
                {procesando ? 'Calculando…' : 'Continuar'}
              </button>
            ) : (
              <button disabled={procesando} onClick={() => void confirmar()} className={claseBotonPrimario}>
                {procesando ? 'Creando pedido…' : 'Confirmar pedido'}
              </button>
            )}
          </div>
        </div>
        <ResumenLateral {...resumen} />
      </div>
    </>,
    'max-w-6xl'
  )
}
