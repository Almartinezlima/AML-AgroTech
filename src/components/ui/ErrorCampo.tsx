import { LuCircleAlert } from 'react-icons/lu'

// Mensaje de error debajo de un campo (fase 9E). El campo lo enlaza con
// aria-describedby={idErrorCampo(id)} y aria-invalid.
export const idErrorCampo = (campo: string) => `${campo}-error`

export default function ErrorCampo({ campo, mensaje }: { campo: string; mensaje?: string }) {
  if (!mensaje) return null
  return (
    <p id={idErrorCampo(campo)} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-estado-error-texto">
      <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{mensaje}</span>
    </p>
  )
}

// Props de accesibilidad para un campo con (o sin) error
export const propsCampo = (campo: string, mensaje?: string) => ({
  'aria-invalid': mensaje ? true : undefined,
  'aria-describedby': mensaje ? idErrorCampo(campo) : undefined,
})
