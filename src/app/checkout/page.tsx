'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, clasePagina } from '@/components/ui/estilos'
import { useAuth } from '@/context/AuthContext'
import { useCarrito } from '@/context/CarritoContext'
import { ErrorPedidoApi, enviarJson, mensajeDeError } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { Cotizacion, MetodoPago, PedidoCreado, ZonaEnvio } from '@/types/comercio'
import PasoEntrega, { type DatosEntrega } from './_components/PasoEntrega'
import PasoPago from './_components/PasoPago'
import PasoResumen from './_components/PasoResumen'

const PASOS = ['Entrega', 'Pago', 'Resumen']

export default function CheckoutPage() {
  const router = useRouter()
  const { perfil } = useAuth()
  const { items, ajustarStock, limpiarCarrito, listo } = useCarrito()
  const zonas = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')
  const [paso, setPaso] = useState(0)
  const [entrega, setEntrega] = useState<DatosEntrega>({ zonaId: '', direccion: '', telefono: '', notas: '' })
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
    // Una zona sin contra entrega invalida ese método
    if (cambios.zonaId) setMetodo(null)
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

  const avanzar = async () => {
    setError('')

    if (paso === 0) {
      if (!zona) return setError('Elige dónde recibir tu pedido.')
      if (zona.tipo !== 'recojo' && !entrega.direccion.trim()) return setError('Escribe la dirección de entrega.')
      if (!/^[0-9+() -]{7,20}$/.test(entrega.telefono.trim())) return setError('Escribe un teléfono válido.')
      return setPaso(1)
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
    if (!metodo) return
    setProcesando(true)
    setError('')
    try {
      const pedido = await enviarJson<PedidoCreado>('/api/pedidos', 'POST', {
        items: lineas,
        zona_id: entrega.zonaId,
        direccion: entrega.direccion.trim() || null,
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

  const contenedor = (contenido: React.ReactNode) => (
    <div className={clasePagina}><div className="max-w-2xl mx-auto">{contenido}</div></div>
  )

  if (pedidoCreado.current || !listo) return contenedor(<BloqueCarga filas={2} />)
  if (items.length === 0) {
    return contenedor(
      <BloqueVacio icono="🛒" mensaje="Tu carrito está vacío">
        <Link href="/catalogo" className={claseBotonPrimario}>Ver catálogo</Link>
      </BloqueVacio>
    )
  }
  if (zonas.cargando) return contenedor(<BloqueCarga filas={5} />)
  if (zonas.error || !zonas.datos) return contenedor(<BloqueError mensaje={zonas.error} onReintentar={() => void zonas.recargar()} />)

  return contenedor(
    <>
      <h1 className="text-3xl font-bold text-[#f0fdf4] mb-6">Finalizar compra</h1>

      <ol className="flex gap-2 mb-6" aria-label="Pasos de la compra">
        {PASOS.map((nombre, i) => (
          <li key={nombre} aria-current={i === paso ? 'step' : undefined}
            className={`flex-1 text-center text-sm py-2 rounded-lg ${i === paso ? 'bg-[#22c55e] text-[#0a0f0a] font-bold' : i < paso ? 'bg-[#162016] text-[#22c55e]' : 'bg-[#111811] text-[#86efac]'}`}>
            {i + 1}. {nombre}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-5">
        <AvisoError mensaje={error} />

        {paso === 0 && <PasoEntrega zonas={zonas.datos} datos={entrega} onCambiar={cambiarEntrega} />}
        {paso === 1 && zona && <PasoPago zona={zona} metodo={metodo} onCambiar={setMetodo} />}
        {paso === 2 && zona && metodo && cotizacion && (
          <PasoResumen cotizacion={cotizacion} zona={zona} direccion={entrega.direccion} telefono={entrega.telefono} metodo={metodo} />
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          {paso > 0 ? (
            <button disabled={procesando} onClick={() => { setError(''); setPaso(paso - 1) }} className={claseBotonSecundario}>← Atrás</button>
          ) : (
            <Link href="/carrito" className={claseBotonSecundario}>← Volver al carrito</Link>
          )}
          {paso < 2 ? (
            <button disabled={procesando} onClick={() => void avanzar()} className={claseBotonPrimario}>
              {procesando ? 'Calculando...' : 'Continuar'}
            </button>
          ) : (
            <button disabled={procesando} onClick={() => void confirmar()} className={claseBotonPrimario}>
              {procesando ? 'Creando pedido...' : 'Confirmar pedido'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
