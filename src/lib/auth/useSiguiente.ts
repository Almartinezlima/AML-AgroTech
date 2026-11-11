'use client'
import { useEffect, useState } from 'react'
import { rutaInterna } from './redireccion'

// Devuelve "?siguiente=/ruta" (validada) para que login ⇄ registro no pierdan a dónde iba la persona.
// Se lee después de montar para que el servidor y el navegador coincidan.
export function useConsultaSiguiente() {
  const [consulta, setConsulta] = useState('')
  useEffect(() => {
    const siguiente = new URLSearchParams(window.location.search).get('siguiente')
    const destino = rutaInterna(siguiente, '')
    setConsulta(destino ? `?siguiente=${encodeURIComponent(destino)}` : '')
  }, [])
  return consulta
}
