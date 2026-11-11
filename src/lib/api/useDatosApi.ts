'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorPedidoApi, mensajeDeError, pedirApi } from '@/lib/api/cliente'

// Carga datos de la API y expone los estados de carga y error de la pantalla
export function useDatosApi<T>(url: string | null) {
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

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { datos, cargando, error, estadoError, recargar, setDatos }
}
