import type { AuthError } from '@supabase/supabase-js'

// Traduce los códigos de error de Supabase Auth a mensajes claros.
// Nunca se esconde el motivo: si el código no se conoce, se muestra igual.
const MENSAJES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Confirma tu correo: te enviamos un enlace para activar tu cuenta.',
  over_request_rate_limit: 'Demasiados intentos, espera un momento y vuelve a probar.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos y vuelve a probar.',
  user_banned: 'Tu cuenta está desactivada. Comunícate con AML AgroTech.',
  user_already_exists: 'Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.',
  email_exists: 'Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.',
  weak_password: 'La contraseña es muy débil: usa al menos 8 caracteres combinando letras y números.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  email_address_invalid: 'El correo no es válido. Revísalo e intenta de nuevo.',
  email_address_not_authorized: 'No se pueden enviar correos a esa dirección.',
  signup_disabled: 'El registro de cuentas nuevas está cerrado por ahora.',
  otp_expired: 'El enlace ya venció o ya se usó. Pide uno nuevo.',
  session_not_found: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
  session_expired: 'Tu sesión venció. Vuelve a iniciar sesión.',
  validation_failed: 'Revisa los datos: hay un campo con formato inválido.',
}

export function mensajeErrorAuth(error: AuthError): string {
  if (error.code && MENSAJES[error.code]) return MENSAJES[error.code]
  // status 0: no hubo respuesta (sin internet o Supabase caído)
  if (error.status === 0 || error.name === 'AuthRetryableFetchError') {
    return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
  }
  if (error.status === 429) return MENSAJES.over_request_rate_limit
  return `No se pudo completar: ${error.message}${error.code ? ` (${error.code})` : ''}`
}
