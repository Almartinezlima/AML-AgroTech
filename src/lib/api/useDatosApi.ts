'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorPedidoApi, mensajeDeError, pedirApi } from '@/lib/api/cliente'

interface OpcionesDatosApi<T> {
  // Fase 9G: vuelve a pedir los datos en silencio cada tantos ms (solo con la pestaña a la vista)
  // y al volver a la pestaña. Sin pantalla de carga y sin mostrar errores pasajeros.
  cadaMs?: number
  // Cómo juntar lo nuevo con lo que ya se ve en una recarga silenciosa (por ejemplo, conservar
  // las URL firmadas de los comprobantes para que las fotos no se vuelvan a descargar)
  combinar?: (anterior: T, nuevo: T) => T
}

// Carga datos de la API y expone los estados de carga y error de la pantalla
export function useDatosApi<T>(url: string | null, opciones: OpcionesDatosApi<T> = {}) {
  const { cadaMs } = opciones
  // En una ref: así una función nueva en cada render no reinicia el intervalo
  const combinar = useRef(opciones.combinar)
  combinar.current = opciones.combinar
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(url !== null)
  const [error, setError] = useState('')
  // Código HTTP del error (404 = no existe), para mostrar el estado correcto
  const [estadoError, setEstadoError] = useState<number | null>(null)
  // Número del último pedido: si el usuario cambia el filtro mientras carga, la respuesta
  // vieja que llegue tarde se descarta y no pisa los datos nuevos (auditoría fase 6B)
  const ultimoPedido = useRef(0)

  const recargar = useCallback(async () => {
    if (!url) return
    const numero = ++ultimoPedido.current
    const vigente = () => numero === ultimoPedido.current
    setCargando(true)
    setError('')
    setEstadoError(null)
    try {
      const respuesta = await pedirApi<T>(url)
      if (vigente()) setDatos(respuesta)
    } catch (causa) {
      if (!vigente()) return
      setError(mensajeDeError(causa, 'No se pudieron cargar los datos.'))
      setEstadoError(causa instanceof ErrorPedidoApi ? causa.estado : null)
    } finally {
      if (vigente()) setCargando(false)
    }
  }, [url])

  // Recarga silenciosa: no invalida una carga normal en curso; si mientras tanto empezó otra
  // carga normal, la respuesta silenciosa se descarta y gana la normal
  const refrescar = useCallback(async () => {
    if (!url) return
    const numero = ultimoPedido.current
    try {
      const respuesta = await pedirApi<T>(url)
      if (numero === ultimoPedido.current) {
        const juntar = combinar.current
        setDatos((anterior) => (anterior !== null && juntar ? juntar(anterior, respuesta) : respuesta))
        setError('')
        setEstadoError(null)
      }
    } catch {
      // Sin conexión un momento: se mantiene lo último que se vio
    }
  }, [url])

  useEffect(() => {
    void recargar()
  }, [recargar])

  useEffect(() => {
    if (!url || !cadaMs) return
    const visible = () => document.visibilityState === 'visible'
    const intervalo = window.setInterval(() => { if (visible()) void refrescar() }, cadaMs)
    const alVolver = () => { if (visible()) void refrescar() }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [url, cadaMs, refrescar])

  return { datos, cargando, error, estadoError, recargar, refrescar, setDatos }
}

// Cada cuánto se actualizan solas las pantallas que cambian mientras se miran (fase 9G)
export const CADA_10_S = 10_000
