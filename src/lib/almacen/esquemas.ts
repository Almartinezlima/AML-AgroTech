import { z } from 'zod'

const nota = (mensaje: string) =>
  z.string({ error: mensaje }).trim().min(3, { error: mensaje }).max(300, { error: 'Máximo 300 caracteres.' })

export const esquemaMarcarItem = z.strictObject(
  { marcado: z.boolean({ error: 'Indica si el producto está en la caja.' }) },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaFaltante = z.strictObject(
  {
    nota: nota('Describe el faltante (al menos 3 letras).'),
    item_id: z.uuid({ error: 'El producto no es válido.' }).nullable().optional(),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaEmpacar = z.strictObject(
  {
    bultos: z.number({ error: 'Indica cuántos bultos son.' }).int({ error: 'Los bultos van en números enteros.' })
      .min(1, { error: 'Al menos 1 bulto.' }).max(50, { error: 'Máximo 50 bultos.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaResolverFaltante = z.strictObject(
  { nota: nota('Indica cómo se resolvió (al menos 3 letras).') },
  { error: 'Los datos enviados no son válidos.' }
)
