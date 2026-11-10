'use client'
import { useCallback, useEffect, useState } from 'react'
import { mensajeDeError, pedirApi } from '@/lib/api/cliente'

// Carga datos de la API y expone los estados de carga y error de la pantalla
export function useDatosApi<T>(url: string | null) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(url !== null)
  const [error, setError] = useState('')

  const recargar = useCallback(async () => {
    if (!url) return
    setCargando(true)
    setError('')
    try {
      setDatos(await pedirApi<T>(url))
    } catch (causa) {
      setError(mensajeDeError(causa, 'No se pudieron cargar los datos.'))
    } finally {
      setCargando(false)
    }
  }, [url])

  useEffect(() => {
    void recargar()
  }, [recargar])

  return { datos, cargando, error, recargar, setDatos }
}
