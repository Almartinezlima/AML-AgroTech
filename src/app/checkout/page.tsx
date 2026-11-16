'use client'
import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuArrowLeft, LuArrowRight, LuShoppingCart } from 'react-icons/lu'
import PasosCompra from '@/components/compra/PasosCompra'
import { Aviso, AvisoError, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBotonPrimario, claseBotonSecundario, claseEnlace, clasePagina, claseTituloPagina } from '@/components/ui/estilos'
import { useCarrito } from '@/context/CarritoContext'
import { enviarJson } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { REGEX_CI, REGEX_TELEFONO } from '@/lib/ecommerce/reglas'
import { formatoBs } from '@/lib/utils'
import type { Cotizacion, MetodoPago, PedidoCreado, ZonaEnvio } from '@/types/comercio'
import { ERRORES_ENTREGA, errorDeCompra } from './_components/mensajesCompra'
import PasoEntrega, { type DatosEntrega } from './_components/PasoEntrega'
import PasoPago from './_components/PasoPago'
import PasoResumen from './_components/PasoResumen'
import { ResumenLateral, ResumenPlegable } from './_components/ResumenCompra'
import { useDatosRecordados } from './_components/useDatosRecordados'

// Dos pasos dentro del checkout: 0 = Datos y envío, 1 = Pago (revisar y confirmar).
// En la barra son los pasos 2 y 3 de Carrito → Datos y envío → Pago → Listo.
const ENTREGA_VACIA: DatosEntrega = { zonaId: '', direccion: '', recogeNombre: '', recogeCi: '', telefono: '', notas: '' }
const TITULOS = ['Datos y envío', 'Revisa y elige cómo pagar']

export default function CheckoutPage() {
  const router = useRouter()
  const { items, ajustarStock, limpiarCarrito, listo } = useCarrito()
  const zonas = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')
  const [paso, setPasoEstado] = useState(0)
  const [entrega, setEntregaEstado] = useState<DatosEntrega>(ENTREGA_VACIA)
  const [metodo, setMetodo] = useState<MetodoPago | null>(null)
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [sesionVencida, setSesionVencida] = useState(false)
  // Evita que se vea "carrito vacío" mientras se va a la pantalla de éxito
  const pedidoCreado = useRef(false)

  const setEntrega = useCallback((cambio: (d: DatosEntrega) => DatosEntrega) => setEntregaEstado(cambio), [])
  const recordados = useDatosRecordados(zonas.datos, setEntrega)

  const zona = zonas.datos?.find((z) => z.id === entrega.zonaId)
  const lineas = items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad }))

  const irAPaso = (nuevo: number) => {
    setError('')
    setSesionVencida(false)
    setPasoEstado(nuevo)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cambiarEntrega = (cambios: Partial<DatosEntrega>) => {
    setEntregaEstado((d) => ({ ...d, ...cambios }))
    // Una zona sin contra entrega invalida ese método; el total también cambia
    if (cambios.zonaId) { setMetodo(null); setCotizacion(null) }
  }

  const tratarError = (causa: unknown) => {
    const problema = errorDeCompra(causa, items)
    if (problema.tipo === 'sesion') return setSesionVencida(true)
    if (problema.tipo === 'stock') {
      ajustarStock(problema.productoId, problema.disponible)
      setCotizacion(null)
      irAPaso(0)
    }
    setError(problema.mensaje)
  }

  const errorEntrega = () => {
    if (!zona) return ERRORES_ENTREGA.zona
    if (zona.tipo === 'urbano' && !entrega.direccion.trim()) return ERRORES_ENTREGA.direccion
    if (zona.tipo === 'provincia') {
      if (entrega.recogeNombre.trim().length < 3) return ERRORES_ENTREGA.recogeNombre
      if (!REGEX_CI.test(entrega.recogeCi.trim())) return ERRORES_ENTREGA.recogeCi
    }
    if (!REGEX_TELEFONO.test(entrega.telefono.trim())) return ERRORES_ENTREGA.telefono
    return ''
  }

  // Datos y envío → Pago: el total lo calcula el servidor
  const irAlPago = async () => {
    setError('')
    const problema = errorEntrega()
    if (problema) return setError(problema)
    setProcesando(true)
    try {
      setCotizacion(await enviarJson<Cotizacion>('/api/pedidos/cotizar', 'POST', { items: lineas, zona_id: entrega.zonaId }))
      irAPaso(1)
    } catch (causa) {
      tratarError(causa)
    } finally {
      setProcesando(false)
    }
  }

  const confirmar = async () => {
    setError('')
    if (!metodo) return setError(ERRORES_ENTREGA.metodo)
    if (!zona) return
    setProcesando(true)
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

  const resumen = { items, zona, cotizacion: paso === 1 ? cotizacion ?? undefined : undefined }

  return contenedor(
    <>
      <PasosCompra actual={paso === 0 ? 1 : 2} onVolver={(p) => { if (p === 1) irAPaso(0) }} />
      <h1 className={`${claseTituloPagina} mb-6`}>{TITULOS[paso]}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <ResumenPlegable {...resumen} />
          {sesionVencida && (
            <Aviso tipo="error">
              Tu sesión se cerró. <Link href="/auth/login?siguiente=%2Fcheckout" className={claseEnlace}>Vuelve a entrar</Link>; tu carrito sigue guardado.
            </Aviso>
          )}
          <AvisoError mensaje={error} />
          {paso === 0 && recordados && (
            <Aviso tipo="ok">Usamos los datos de tu última compra. Puedes cambiarlos.</Aviso>
          )}

          {paso === 0 && <PasoEntrega zonas={zonas.datos} datos={entrega} onCambiar={cambiarEntrega} />}
          {paso === 1 && zona && cotizacion && (
            <>
              <PasoResumen cotizacion={cotizacion} zona={zona} entrega={entrega} />
              <PasoPago zona={zona} metodo={metodo} onCambiar={(m) => { setError(''); setMetodo(m) }} />
            </>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {paso === 0 ? (
              <Link href="/carrito" className={claseBotonSecundario}><LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al carrito</Link>
            ) : (
              <button disabled={procesando} onClick={() => irAPaso(0)} className={claseBotonSecundario}>
                <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Cambiar datos de entrega
              </button>
            )}
            {paso === 0 ? (
              <button disabled={procesando} onClick={() => void irAlPago()} className={claseBotonPrimario}>
                {procesando ? 'Calculando tu total…' : <>Elegir cómo pagar <LuArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </button>
            ) : (
              <button disabled={procesando} onClick={() => void confirmar()} className={claseBotonPrimario}>
                {procesando ? 'Registrando tu pedido…' : `Confirmar pedido · ${formatoBs(cotizacion?.total ?? 0)}`}
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
