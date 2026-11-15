'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useDatosApi } from '@/lib/api/useDatosApi'
import type { UltimaEntrega, ZonaEnvio } from '@/types/comercio'
import type { DatosEntrega } from './PasoEntrega'

// Rellena el checkout con los datos de la última compra (fase 4): zona, dirección, teléfono y
// quién recoge. Sin compras previas usa el teléfono y el nombre de la cuenta. Nunca pisa lo que
// el cliente ya escribió y todo se puede editar. Devuelve true si se usaron datos de una compra.
export function useDatosRecordados(
  zonas: ZonaEnvio[] | null,
  setEntrega: (cambio: (d: DatosEntrega) => DatosEntrega) => void
) {
  const { perfil } = useAuth()
  const ultima = useDatosApi<UltimaEntrega | null>('/api/pedidos/ultima-entrega')
  const aplicado = useRef(false)
  const [recordados, setRecordados] = useState(false)

  useEffect(() => {
    // Espera a tener zonas, perfil y la respuesta (o su error: entonces solo usa la cuenta)
    if (aplicado.current || !zonas || !perfil || ultima.cargando) return
    aplicado.current = true

    const previa = ultima.datos
    const zonaActiva = previa?.zona_id && zonas.some((z) => z.id === previa.zona_id) ? previa.zona_id : ''
    const sinVacio = (actual: string, ...opciones: Array<string | null | undefined>) =>
      actual || opciones.find((o) => o && o.trim()) || ''

    setEntrega((d) => ({
      ...d,
      zonaId: d.zonaId || zonaActiva,
      direccion: sinVacio(d.direccion, previa?.direccion),
      telefono: sinVacio(d.telefono, previa?.telefono, perfil.telefono),
      recogeNombre: sinVacio(d.recogeNombre, previa?.recoge_nombre, perfil.nombre),
      recogeCi: sinVacio(d.recogeCi, previa?.recoge_ci),
    }))
    setRecordados(Boolean(previa))
  }, [zonas, perfil, ultima.cargando, ultima.datos, setEntrega])

  return recordados
}
