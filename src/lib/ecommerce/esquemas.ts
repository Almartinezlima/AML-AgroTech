import { z } from 'zod'
import { ESTADOS_PEDIDO, METODOS_PAGO, TIPOS_ZONA } from '@/types/comercio'

const textoOpcional = (maximo: number) =>
  z.string({ error: 'El texto no es válido.' }).trim().max(maximo, { error: `Máximo ${maximo} caracteres.` }).nullable().optional()

const ITEM = z.strictObject(
  {
    producto_id: z.uuid({ error: 'Hay un producto no válido.' }),
    cantidad: z.number({ error: 'La cantidad no es válida.' }).int({ error: 'La cantidad no es válida.' }).min(1, { error: 'La cantidad mínima es 1.' }).max(100000, { error: 'La cantidad es demasiado grande.' }),
  },
  { error: 'Hay un producto con datos inválidos.' }
)

const ITEMS = z.array(ITEM, { error: 'El carrito no es válido.' }).min(1, { error: 'El carrito está vacío.' }).max(50, { error: 'El pedido tiene demasiados productos.' })

export const esquemaCotizar = z.strictObject(
  { items: ITEMS, zona_id: z.uuid({ error: 'Elige una zona de envío.' }) },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaCrearPedido = z.strictObject(
  {
    items: ITEMS,
    zona_id: z.uuid({ error: 'Elige una zona de envío.' }),
    direccion: textoOpcional(300),
    telefono: z.string({ error: 'El teléfono es obligatorio.' }).trim().regex(/^[0-9+() -]{7,20}$/, { error: 'El teléfono no es válido.' }),
    metodo_pago: z.enum(METODOS_PAGO, { error: 'El método de pago no es válido.' }),
    notas: textoOpcional(500),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaCancelar = z.strictObject({ motivo: textoOpcional(300) }, { error: 'Los datos enviados no son válidos.' })

export const esquemaEstadoPedido = z.strictObject(
  {
    estado: z.enum(ESTADOS_PEDIDO, { error: 'El estado no es válido.' }),
    nota: textoOpcional(300),
    transportista: textoOpcional(100),
    numero_guia: textoOpcional(60),
  },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaVerificarPago = z.strictObject(
  { aprobado: z.boolean({ error: 'Indica si se aprueba o se rechaza.' }), motivo: textoOpcional(300) },
  { error: 'Los datos enviados no son válidos.' }
)

export const esquemaMovimiento = z.strictObject(
  {
    producto_id: z.uuid({ error: 'El producto no es válido.' }),
    tipo: z.enum(['entrada', 'ajuste'], { error: 'El tipo de movimiento no es válido.' }),
    cantidad: z.number({ error: 'La cantidad no es válida.' }).int({ error: 'La cantidad no es válida.' }).refine((n) => n !== 0, { error: 'La cantidad no puede ser cero.' }),
    motivo: z.string({ error: 'El motivo es obligatorio.' }).trim().min(3, { error: 'Describe el motivo.' }).max(300, { error: 'Máximo 300 caracteres.' }),
  },
  { error: 'Los datos enviados no son válidos.' }
)

const camposProducto = {
  sku: z.string({ error: 'El SKU no es válido.' }).trim().min(1, { error: 'El SKU no es válido.' }).max(30, { error: 'Máximo 30 caracteres.' }).nullable().optional(),
  nombre: z.string({ error: 'El nombre es obligatorio.' }).trim().min(2, { error: 'El nombre es muy corto.' }).max(150, { error: 'Máximo 150 caracteres.' }),
  descripcion: textoOpcional(1000),
  precio: z.number({ error: 'El precio no es válido.' }).positive({ error: 'El precio debe ser mayor a 0.' }).max(99999999, { error: 'El precio es demasiado alto.' }),
  stock_minimo: z.number({ error: 'El stock mínimo no es válido.' }).int({ error: 'El stock mínimo no es válido.' }).min(0, { error: 'El stock mínimo no es válido.' }),
  unidad: z.string({ error: 'La unidad es obligatoria.' }).trim().min(1, { error: 'La unidad es obligatoria.' }).max(30, { error: 'Máximo 30 caracteres.' }),
  categoria_id: z.uuid({ error: 'Elige una categoría.' }),
  icono: z.string({ error: 'El icono no es válido.' }).trim().max(8, { error: 'El icono no es válido.' }).optional(),
  imagen_url: z.url({ error: 'La imagen no es válida.' }).nullable().optional(),
}

// El stock no está aquí a propósito: solo cambia con movimientos de inventario
export const esquemaCrearProducto = z.strictObject(camposProducto, { error: 'Los datos enviados no son válidos.' })

export const esquemaEditarProducto = z
  .strictObject(
    {
      ...Object.fromEntries(Object.entries(camposProducto).map(([clave, esquema]) => [clave, esquema.optional()])),
      activo: z.boolean({ error: 'El estado no es válido.' }).optional(),
    },
    { error: 'Los datos enviados no son válidos.' }
  )
  .refine((cambios) => Object.keys(cambios).length > 0, { error: 'No hay cambios para guardar.' })

const camposZona = {
  nombre: z.string({ error: 'El nombre es obligatorio.' }).trim().min(2, { error: 'El nombre es muy corto.' }).max(100, { error: 'Máximo 100 caracteres.' }),
  tipo: z.enum(TIPOS_ZONA, { error: 'El tipo no es válido.' }),
  costo: z.number({ error: 'El costo no es válido.' }).min(0, { error: 'El costo no es válido.' }).max(99999, { error: 'El costo es demasiado alto.' }),
  dias_min: z.number({ error: 'Los días no son válidos.' }).int({ error: 'Los días no son válidos.' }).min(0, { error: 'Los días no son válidos.' }).max(60, { error: 'Máximo 60 días.' }),
  dias_max: z.number({ error: 'Los días no son válidos.' }).int({ error: 'Los días no son válidos.' }).min(0, { error: 'Los días no son válidos.' }).max(60, { error: 'Máximo 60 días.' }),
  permite_contra_entrega: z.boolean({ error: 'El valor no es válido.' }),
  orden: z.number({ error: 'El orden no es válido.' }).int({ error: 'El orden no es válido.' }).min(0, { error: 'El orden no es válido.' }).max(999, { error: 'El orden no es válido.' }).optional(),
}

export const esquemaCrearZona = z
  .strictObject(camposZona, { error: 'Los datos enviados no son válidos.' })
  .refine((z) => z.dias_max >= z.dias_min, { error: 'Los días máximos no pueden ser menores a los mínimos.' })

export const esquemaEditarZona = z
  .strictObject(
    { ...camposZona, activo: z.boolean({ error: 'El estado no es válido.' }) },
    { error: 'Los datos enviados no son válidos.' }
  )
  .partial()
  .refine((c) => Object.keys(c).length > 0, { error: 'No hay cambios para guardar.' })
  .refine((c) => c.dias_min === undefined || c.dias_max === undefined || c.dias_max >= c.dias_min, {
    error: 'Los días máximos no pueden ser menores a los mínimos.',
  })
