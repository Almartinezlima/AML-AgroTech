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

// ───── Órdenes de compra (0015) ─────
const cantidadPresentaciones = z
  .number({ error: 'La cantidad no es válida.' })
  .int({ error: 'La cantidad va en números enteros.' })
  .max(100000, { error: 'La cantidad es demasiado grande.' })

const motivo = (que: string) =>
  z.string({ error: `Escribe el motivo ${que}.` }).trim().min(3, { error: `Escribe el motivo ${que} (mínimo 3 caracteres).` }).max(300, { error: 'Máximo 300 caracteres.' })

// "Armar orden": junta por proveedor en sus borradores
export const esquemaArmarOrdenes = z.strictObject(
  {
    lineas: z
      .array(
        z.strictObject({
          presentacion_id: z.uuid({ error: 'La presentación no es válida.' }),
          cantidad: cantidadPresentaciones.min(1, { error: 'Pide al menos 1.' }),
        }),
        { error: 'Elige al menos un producto.' }
      )
      .min(1, { error: 'Elige al menos un producto.' })
      .max(200, { error: 'Son demasiadas líneas.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

// Cambiar o sumar una línea del borrador (0 = quitarla)
export const esquemaLineaBorrador = z.strictObject(
  {
    presentacion_id: z.uuid({ error: 'La presentación no es válida.' }),
    cantidad: cantidadPresentaciones.min(0, { error: 'La cantidad no puede ser negativa.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaMotivoCancelacion = z.strictObject({ motivo: motivo('de la cancelación') }, { error: 'Los datos enviados no son válidos.' })
export const esquemaMotivoRechazo = z.strictObject({ motivo: motivo('del rechazo') }, { error: 'Los datos enviados no son válidos.' })

export const esquemaAceptarOrden = z.strictObject(
  {
    // AAAA-MM-DD del calendario; la base valida que no sea antes de hoy en Bolivia
    fecha_estimada: z.string({ error: 'Elige la fecha de entrega.' }).regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Elige la fecha de entrega.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaDespacharOrden = z.strictObject(
  {
    transportista: z.string({ error: 'Escribe el transportista.' }).trim().min(2, { error: 'Escribe el transportista.' }).max(80, { error: 'Máximo 80 caracteres.' }),
    guia: z.string({ error: 'Escribe el número de guía.' }).trim().min(1, { error: 'Escribe el número de guía.' }).max(60, { error: 'Máximo 60 caracteres.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaRecibirOrden = z.strictObject(
  {
    lineas: z
      .array(
        z.strictObject({
          item_id: z.uuid({ error: 'La línea no es válida.' }),
          cantidad_recibida: cantidadPresentaciones.min(0, { error: 'Lo recibido no puede ser negativo.' }),
        })
      )
      .min(1, { error: 'Indica lo que llegó de cada línea.' })
      .max(200),
    nota: z.string().trim().max(300, { error: 'La nota es muy larga (máximo 300 caracteres).' }).optional(),
  },
  { error: 'Los datos enviados no son válidos.' }
)
