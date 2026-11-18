import { z } from 'zod'

const DATOS_INVALIDOS = { error: 'Los datos enviados no son válidos.' }

const nota = (mensaje: string) =>
  z.string({ error: mensaje }).trim().min(3, { error: mensaje }).max(300, { error: 'Máximo 300 caracteres.' })

// "Estoy disponible / No disponible" (repartidor, 0020)
export const esquemaDisponibilidad = z.strictObject(
  { disponible: z.boolean({ error: 'Indica si estás disponible.' }) },
  DATOS_INVALIDOS
)

// "Pagado" al repartidor: el monto que el admin vio (la base frena si cambió)
export const esquemaPagarRepartidor = z.strictObject(
  {
    monto: z.number({ error: 'El monto no es válido.' }).positive({ error: 'El monto tiene que ser mayor a cero.' })
      .max(99_999_999, { error: 'El monto no es válido.' }),
  },
  DATOS_INVALIDOS
)

export const esquemaEntregar = z.strictObject(
  {
    codigo: z.string({ error: 'Escribe el código de 4 dígitos que tiene el cliente.' }).trim()
      .regex(/^[0-9]{4}$/, { error: 'El código son 4 números.' }),
    nombre: z.string({ error: 'Escribe el nombre de quien recibe.' }).trim()
      .min(3, { error: 'Escribe el nombre de quien recibe (al menos 3 letras).' }).max(120, { error: 'Máximo 120 caracteres.' }),
    ci: z.string().trim().max(20, { error: 'El CI va hasta 20 caracteres.' })
      .refine((v) => v === '' || v.length >= 4, { error: 'El CI va de 4 a 20 caracteres.' })
      .nullable().optional(),
  },
  DATOS_INVALIDOS
)

export const esquemaDesbloquear = z.strictObject(
  { nota: nota('Indica por qué se desbloquea (al menos 3 letras).') },
  DATOS_INVALIDOS
)

// Por flota: el cliente no manda nada; el admin manda la nota (la exige la base)
export const esquemaRecibido = z.strictObject(
  { nota: z.string().trim().max(300, { error: 'Máximo 300 caracteres.' }).nullable().optional() },
  DATOS_INVALIDOS
)

export const esquemaCalificar = z.strictObject(
  {
    estrellas: z.number({ error: 'Elige de 1 a 5 estrellas.' }).int({ error: 'Elige de 1 a 5 estrellas.' })
      .min(1, { error: 'Elige de 1 a 5 estrellas.' }).max(5, { error: 'Elige de 1 a 5 estrellas.' }),
    comentario: z.string().trim().max(200, { error: 'El comentario va hasta 200 letras.' }).nullable().optional(),
  },
  DATOS_INVALIDOS
)
