import { z } from 'zod'
import { CIUDADES_DISTRIBUIDOR } from '@/types/abastecimiento'

const textoOpcional = (minimo: number, maximo: number, nombre: string) =>
  z
    .string({ error: `${nombre} no es válido.` })
    .trim()
    .transform((valor) => valor || null)
    .pipe(z.string().min(minimo, { error: `${nombre}: mínimo ${minimo} caracteres.` }).max(maximo, { error: `${nombre}: máximo ${maximo} caracteres.` }).nullable())
    .nullable()
    .optional()

const diasEntrega = z
  .number({ error: 'Los días de entrega no son válidos.' })
  .int({ error: 'Los días de entrega van en números enteros.' })
  .min(0, { error: 'Los días de entrega no pueden ser negativos.' })
  .max(60, { error: 'Máximo 60 días de entrega.' })

// ───── Ficha del distribuidor (la carga el admin) ─────
const camposFicha = {
  nombre_comercial: z.string({ error: 'El nombre comercial es obligatorio.' }).trim().min(2, { error: 'El nombre comercial es muy corto.' }).max(120, { error: 'Máximo 120 caracteres.' }),
  ciudad: z.enum(CIUDADES_DISTRIBUIDOR, { error: 'Elige Sucre o Santa Cruz.' }),
  telefono: z
    .string({ error: 'El teléfono no es válido.' })
    .trim()
    .transform((valor) => valor || null)
    .pipe(z.string().regex(/^[0-9+() -]{6,20}$/, { error: 'El teléfono no es válido.' }).nullable())
    .nullable()
    .optional(),
  nit: textoOpcional(5, 20, 'El NIT'),
  dias_entrega: diasEntrega,
}

export const esquemaCrearDistribuidor = z.strictObject(
  { usuario_id: z.uuid({ error: 'Elige la cuenta del distribuidor.' }), ...camposFicha },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaEditarDistribuidor = z
  .strictObject(
    { ...camposFicha, activo: z.boolean({ error: 'El estado no es válido.' }) },
    { error: 'Los datos enviados no son válidos.' }
  )
  .partial()
  .refine((cambios) => Object.keys(cambios).length > 0, { message: 'No hay cambios para guardar.' })

// ───── Presentaciones (las carga el distribuidor) ─────
const camposPresentacion = {
  nombre: z.string({ error: 'El nombre de la presentación es obligatorio.' }).trim().min(2, { error: 'El nombre de la presentación es muy corto.' }).max(80, { error: 'Máximo 80 caracteres.' }),
  unidades_por_presentacion: z
    .number({ error: 'Indica cuántas unidades trae.' })
    .int({ error: 'Las unidades van en números enteros.' })
    .min(1, { error: 'Trae al menos 1 unidad.' })
    .max(100000, { error: 'Son demasiadas unidades.' }),
  precio_mayorista: z
    .number({ error: 'El precio no es válido.' })
    .positive({ error: 'El precio tiene que ser mayor a 0.' })
    .max(99999999, { error: 'El precio es demasiado grande.' })
    // Sin multipleOf: con decimales binarios 1080.1 no da múltiplo exacto de 0.01
    .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6, { error: 'El precio va con 2 decimales como máximo.' }),
  disponible: z.boolean({ error: 'La disponibilidad no es válida.' }),
  dias_entrega: diasEntrega.nullable(),
}

export const esquemaCrearPresentacion = z.strictObject(
  { producto_id: z.uuid({ error: 'Elige el producto de la tienda.' }), ...camposPresentacion },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaEditarPresentacion = z
  .strictObject(
    { ...camposPresentacion, activo: z.boolean({ error: 'El estado no es válido.' }) },
    { error: 'Los datos enviados no son válidos.' }
  )
  .partial()
  .refine((cambios) => Object.keys(cambios).length > 0, { message: 'No hay cambios para guardar.' })
