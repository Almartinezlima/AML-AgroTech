'use client'
import { useCallback, useEffect, useState } from 'react'
import { ErrorPedidoApi, mensajeDeError, pedirApi } from '@/lib/api/cliente'

// Carga datos de la API y expone los estados de carga y error de la pantalla
export function useDatosApi<T>(url: string | null) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(url !== null)
  const [error, setError] = useState('')
  // Código HTTP del error (404 = no existe), para mostrar el estado correcto
  const [estadoError, setEstadoError] = useState<number | null>(null)

  const recargar = useCallback(async () => {
    if (!url) return
    setCargando(true)
    setError('')
    setEstadoError(null)
    try {
      setDatos(await pedirApi<T>(url))
    } catch (causa) {
      setError(mensajeDeError(causa, 'No se pudieron cargar los datos.'))
      setEstadoError(causa instanceof ErrorPedidoApi ? causa.estado : null)
    } finally {
      setCargando(false)
    }
  }, [url])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { datos, cargando, error, estadoError, recargar, setDatos }
}
