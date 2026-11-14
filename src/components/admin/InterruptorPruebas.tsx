'use client'
import { useCallback, useEffect, useState } from 'react'

const CLAVE = 'aml-admin-mostrar-pruebas'

// Preferencia del admin: ¿ver los datos de las pruebas E2E (@amlagrotech.test)?
// Apagada por defecto. Se recuerda en este navegador; si el almacenamiento falla, sigue apagada.
// `listo` avisa cuándo ya se leyó, para no pedir la lista dos veces al abrir la pantalla.
export function useMostrarPruebas() {
  const [mostrar, setMostrarEstado] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    try {
      setMostrarEstado(window.localStorage.getItem(CLAVE) === '1')
    } catch {
      // Navegador sin almacenamiento: queda apagada
    }
    setListo(true)
  }, [])

  const setMostrar = useCallback((valor: boolean) => {
    setMostrarEstado(valor)
    try {
      window.localStorage.setItem(CLAVE, valor ? '1' : '0')
    } catch {
      // Sin almacenamiento: vale solo para esta pantalla
    }
  }, [])

  return { mostrar, setMostrar, listo }
}

// Agrega ?pruebas=1 (o &pruebas=1) a la URL de la API cuando el interruptor está encendido
export function conPruebas(url: string, mostrar: boolean) {
  if (!mostrar) return url
  return `${url}${url.includes('?') ? '&' : '?'}pruebas=1`
}

interface InterruptorPruebasProps {
  mostrar: boolean
  onCambiar: (valor: boolean) => void
}

export default function InterruptorPruebas({ mostrar, onCambiar }: InterruptorPruebasProps) {
  return (
    <label className="inline-flex items-center gap-3 min-h-11 cursor-pointer select-none text-sm text-texto-2">
      <input
        type="checkbox"
        role="switch"
        checked={mostrar}
        aria-checked={mostrar}
        onChange={(e) => onCambiar(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-borde transition-colors peer-checked:bg-acento peer-focus-visible:ring-2 peer-focus-visible:ring-acento/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
      Mostrar datos de prueba
    </label>
  )
}
