'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LuArrowLeft, LuShoppingCart } from 'react-icons/lu'
import PasosCompra from '@/components/compra/PasosCompra'
import { Aviso, BloqueCarga, BloqueError, BloqueVacio } from '@/components/ui/Estados'
import { claseBoton, claseBotonPrimario, claseEnlace, clasePagina, claseTituloPagina } from '@/components/ui/estilos'
import { useCarrito } from '@/context/CarritoContext'
import { enviarJson } from '@/lib/api/cliente'
import { useDatosApi } from '@/lib/api/useDatosApi'
import { formatoBs } from '@/lib/utils'
import type { Cotizacion, MetodoPago, PedidoCreado, ZonaEnvio } from '@/types/comercio'
import { enfocarPrimerError, errorDeCompra, validarCompra, type CampoCompra, type ErroresCompra } from './_components/mensajesCompra'
import PasoEntrega, { type DatosEntrega } from './_components/PasoEntrega'
import PasoPago from './_components/PasoPago'
import { BarraCompra, ResumenLateral, ResumenPlegable, totalCompra } from './_components/ResumenCompra'
import { useDatosRecordados } from './_components/useDatosRecordados'

const ENTREGA_VACIA: DatosEntrega = { zonaId: '', direccion: '', recogeNombre: '', recogeCi: '', telefono: '', notas: '' }

// Qué campo de la pantalla limpia su error al cambiar cada dato
const CAMPO_DE: Partial<Record<keyof DatosEntrega, CampoCompra>> = {
  zonaId: 'zona', direccion: 'direccion', recogeNombre: 'recogeNombre', recogeCi: 'recogeCi', telefono: 'telefono',
}

// Compra en una sola pantalla (fase 9E): zona, datos recordados y forma de pago (QR por defecto).
// «Confirmar pedido» va dentro del cuadro «Tu compra» (en celular, en una barra fija abajo).
// Los errores salen junto a cada campo; al confirmar, la vista va al primero.
export default function CheckoutPage() {
  const router = useRouter()
  const { items, ajustarStock, limpiarCarrito, listo } = useCarrito()
  const zonas = useDatosApi<ZonaEnvio[]>('/api/zonas-envio')
  const [entrega, setEntregaEstado] = useState<DatosEntrega>(ENTREGA_VACIA)
  const [metodo, setMetodo] = useState<MetodoPago>('qr')
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [errores, setErrores] = useState<ErroresCompra>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [sesionVencida, setSesionVencida] = useState(false)
  // Evita que se vea "carrito vacío" mientras se va a la pantalla de pago
  const pedidoCreado = useRef(false)

  const setEntrega = useCallback((cambio: (d: DatosEntrega) => DatosEntrega) => setEntregaEstado(cambio), [])
  const recordados = useDatosRecordados(zonas.datos, setEntrega)

  const zona = zonas.datos?.find((z) => z.id === entrega.zonaId)
  const lineas = items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad }))
  const claveCotizacion = `${entrega.zonaId}|${lineas.map((l) => `${l.producto_id}:${l.cantidad}`).join(',')}`

  const tratarError = useCallback((causa: unknown) => {
    const problema = errorDeCompra(causa, items)
    if (problema.tipo === 'sesion') return setSesionVencida(true)
    if (problema.tipo === 'stock') {
      ajustarStock(problema.productoId, problema.disponible)
      setCotizacion(null)
    }
    setErrorGeneral(problema.mensaje)
  }, [items, ajustarStock])

  // El total exacto lo calcula el servidor al elegir la zona (crear_pedido lo vuelve a calcular)
  useEffect(() => {
    if (!entrega.zonaId || items.length === 0) return setCotizacion(null)
    let vigente = true
    enviarJson<Cotizacion>('/api/pedidos/cotizar', 'POST', { items: lineas, zona_id: entrega.zonaId })
      .then((c) => { if (vigente) setCotizacion(c) })
      .catch((causa) => { if (vigente) { setCotizacion(null); tratarError(causa) } })
    return () => { vigente = false }
    // La clave resume zona y líneas: no hace falta volver a pedir por otro cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCotizacion])

  const cambiarEntrega = (cambios: Partial<DatosEntrega>) => {
    setEntregaEstado((d) => ({ ...d, ...cambios }))
    setErrorGeneral('')
    setErrores((actuales) => {
      const nuevos = { ...actuales }
      for (const clave of Object.keys(cambios) as Array<keyof DatosEntrega>) {
        const campo = CAMPO_DE[clave]
        if (campo) delete nuevos[campo]
      }
      // Una zona sin efectivo deja el pago en QR
      if (cambios.zonaId) delete nuevos.metodo
      return nuevos
    })
    if (cambios.zonaId) {
      const nueva = zonas.datos?.find((z) => z.id === cambios.zonaId)
      if (metodo === 'contra_entrega' && nueva && !nueva.permite_contra_entrega) setMetodo('qr')
    }
  }

  const confirmar = async () => {
    setErrorGeneral('')
    setSesionVencida(false)
    const encontrados = validarCompra(entrega, zona, metodo)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0 || !zona) {
      // Espera a que se pinten los bordes rojos y lleva la vista al primero
      requestAnimationFrame(() => enfocarPrimerError(encontrados))
      return
    }
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

  const resumen = { items, zona, cotizacion: cotizacion && cotizacion.costo_envio === zona?.costo ? cotizacion : undefined }
  const total = totalCompra(resumen)
  const textoBoton = procesando ? 'Registrando tu pedido…' : 'Confirmar pedido'

  // Errores que no son de un campo (sin stock, sesión vencida): junto al botón, nunca arriba
  const avisos = (
    <>
      {sesionVencida && (
        <Aviso tipo="error">
          Tu sesión se cerró. <Link href="/auth/login?siguiente=%2Fcheckout" className={claseEnlace}>Vuelve a entrar</Link>; tu carrito sigue guardado.
        </Aviso>
      )}
      {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}
    </>
  )

  return contenedor(
    <div className="pb-28 lg:pb-0">
      <PasosCompra actual={1} />
      <h1 className={`${claseTituloPagina} mb-2`}>Confirma tu pedido</h1>
      <p className="mb-6 text-texto-2">
        {recordados ? 'Usamos los datos de tu última compra. Revisa y confirma.' : 'Elige dónde lo recibes y cómo pagas.'}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-8">
          <ResumenPlegable {...resumen} />
          <PasoEntrega zonas={zonas.datos} datos={entrega} errores={errores} onCambiar={cambiarEntrega} />
          <PasoPago zona={zona} metodo={metodo} error={errores.metodo}
            onCambiar={(m) => { setMetodo(m); setErrores((e) => { const n = { ...e }; delete n.metodo; return n }) }} />
          <div className="flex flex-col gap-3 lg:hidden">{avisos}</div>
          <Link href="/carrito" className={`${claseBoton('secundario')} self-start`}>
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al carrito
          </Link>
        </div>

        <ResumenLateral {...resumen}>
          {avisos}
          <button type="button" disabled={procesando} onClick={() => void confirmar()} className={`${claseBotonPrimario} w-full min-h-14 text-lg`}>
            {procesando ? textoBoton : `${textoBoton} · ${formatoBs(total)}`}
          </button>
          <p className="text-center text-sm text-texto-2">
            {metodo === 'contra_entrega' ? 'Pagas en efectivo al recibir.' : metodo === 'qr' ? 'Después te mostramos el QR con el monto exacto.' : 'Después te mostramos la cuenta y el monto exacto.'}
          </p>
        </ResumenLateral>
      </div>

      <BarraCompra total={total}>
        <button type="button" disabled={procesando} onClick={() => void confirmar()} className={`${claseBotonPrimario} w-full min-h-12`}>
          {textoBoton}
        </button>
      </BarraCompra>
    </div>,
    'max-w-6xl'
  )
}
