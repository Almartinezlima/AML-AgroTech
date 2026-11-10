import type { Session } from '@supabase/supabase-js'

// Una sesión de recuperación vale solo unos minutos después de abrir el enlace
const VIGENCIA_SEGUNDOS = 15 * 60

interface MetodoAmr {
  method?: string
  timestamp?: number
}

// Lee el "amr" del token (cómo se autenticó la sesión). Solo sirve para decidir qué
// mostrar en pantalla: quien de verdad valida el cambio de contraseña es Supabase.
function metodosDeAutenticacion(session: Session): MetodoAmr[] {
  try {
    const carga = session.access_token.split('.')[1]
    const json = atob(carga.replace(/-/g, '+').replace(/_/g, '/'))
    const amr = (JSON.parse(json) as { amr?: unknown }).amr
    return Array.isArray(amr) ? (amr as MetodoAmr[]) : []
  } catch {
    return []
  }
}

// true solo si la sesión nació de un enlace de recuperación abierto hace poco.
// Una sesión normal (entró con contraseña) nunca cuenta.
export function esSesionDeRecuperacion(session: Session | null): boolean {
  if (!session) return false
  const ahora = Math.floor(Date.now() / 1000)
  return metodosDeAutenticacion(session).some(
    (m) => m.method === 'recovery' && typeof m.timestamp === 'number' && ahora - m.timestamp < VIGENCIA_SEGUNDOS
  )
}

// ¿La URL trae un enlace de recuperación? (?code= del flujo PKCE o #type=recovery del implícito)
export function leerEnlaceRecuperacion(): { traeEnlace: boolean; error: string | null } {
  const consulta = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error = consulta.get('error_description') ?? hash.get('error_description')
  const traeEnlace = consulta.has('code') || hash.get('type') === 'recovery'
  return { traeEnlace, error }
}
