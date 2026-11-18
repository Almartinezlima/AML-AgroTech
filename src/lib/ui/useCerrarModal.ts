'use client'
import { useEffect, useRef } from 'react'

// Modales abiertos, el de encima al final: Esc cierra solo ese
const pila: string[] = []
// Entradas del historial de modales que se cerraron sin Atrás; se sacan juntas
let porSacar: string[] = []
let limpieza: number | null = null

type EstadoHistorial = { amlModal?: string } | null
const marcaArriba = () => (window.history.state as EstadoHistorial)?.amlModal

// Saca de una vez las entradas de los modales que se cerraron juntos (por ejemplo, el visor y
// la confirmación de encima), solo si siguen arriba del historial y no se cambió de pantalla
function programarLimpieza(direccion: string) {
  if (limpieza !== null) return
  limpieza = window.setTimeout(() => {
    limpieza = null
    const cantidad = porSacar.length
    const arriba = marcaArriba()
    const sigueArriba = arriba !== undefined && porSacar.includes(arriba)
    porSacar = []
    if (cantidad > 0 && sigueArriba && window.location.href === direccion) window.history.go(-cantidad)
  }, 0)
}

// Cierre común de modales y visores (fase 9E): Esc y el botón Atrás del celular o del navegador.
// Al abrir se agrega una entrada al historial (con la misma URL); Atrás la quita y cierra.
// Si el modal se cierra por otro lado (X, clic afuera, acción terminada), se saca esa entrada
// para que Atrás no quede "vacío". El historial conserva el estado de Next.js (se copia).
export function useCerrarModal(onCerrar: () => void, bloqueado = false) {
  const cerrar = useRef(onCerrar)
  const bloqueadoRef = useRef(bloqueado)
  const marca = useRef<string | null>(null)

  useEffect(() => {
    cerrar.current = onCerrar
    bloqueadoRef.current = bloqueado
  }, [onCerrar, bloqueado])

  useEffect(() => {
    // En desarrollo React monta, desmonta y vuelve a montar: se reusa la misma entrada
    const reusada = marca.current !== null && porSacar.includes(marca.current)
    if (reusada) {
      porSacar = porSacar.filter((m) => m !== marca.current)
    } else {
      marca.current = `aml-modal-${Date.now()}-${Math.random().toString(36).slice(2)}`
      window.history.pushState({ ...(window.history.state ?? {}), amlModal: marca.current }, '')
    }
    const propia = marca.current as string
    if (!pila.includes(propia)) pila.push(propia)

    const alVolver = () => {
      // Atrás desde un modal de encima no cierra este
      if (marcaArriba() === propia) return
      if (bloqueadoRef.current) {
        // Guardando: no se cierra; se vuelve a poner la entrada
        window.history.pushState({ ...(window.history.state ?? {}), amlModal: propia }, '')
        return
      }
      marca.current = null
      cerrar.current()
    }
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || bloqueadoRef.current) return
      if (pila[pila.length - 1] !== propia) return
      cerrar.current()
    }

    window.addEventListener('popstate', alVolver)
    window.addEventListener('keydown', alPresionar)
    return () => {
      window.removeEventListener('popstate', alVolver)
      window.removeEventListener('keydown', alPresionar)
      const indice = pila.indexOf(propia)
      if (indice >= 0) pila.splice(indice, 1)
      // Cerrado por Atrás: la entrada ya no está (marca.current quedó en null)
      if (marca.current === propia) {
        porSacar.push(propia)
        programarLimpieza(window.location.href)
      }
    }
  }, [])
}
