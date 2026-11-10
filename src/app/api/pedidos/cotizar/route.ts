import type { NextRequest } from 'next/server'
import { ErrorApi, manejarRuta, respuestaError, respuestaOk } from '@/lib/api/respuestas'
import { requerirSesion } from '@/lib/api/sesion'
import { validarCuerpo } from '@/lib/api/validacion'
import { esquemaCotizar } from '@/lib/ecommerce/esquemas'
import type { Cotizacion } from '@/types/comercio'

const redondear = (monto: number) => Math.round(monto * 100) / 100

// POST /api/pedidos/cotizar — Total con precios reales, sin crear nada.
// Es solo para mostrar el resumen: crear_pedido vuelve a calcular todo.
export const POST = manejarRuta(async (request: NextRequest) => {
  const { supabase } = await requerirSesion()
  const { items, zona_id } = await validarCuerpo(request, esquemaCotizar)

  const { data: zona, error: errorZona } = await supabase
    .from('zonas_envio')
    .select('costo')
    .eq('id', zona_id)
    .eq('activo', true)
    .maybeSingle()

  if (errorZona) throw errorZona
  if (!zona) throw new ErrorApi(404, 'NO_ENCONTRADO', 'La zona de envío no está disponible.')

  const { data: productos, error } = await supabase
    .from('productos')
    .select('id, nombre, precio, stock')
    .in('id', items.map((i) => i.producto_id))
    .eq('activo', true)

  if (error) throw error

  const lineas: Cotizacion['items'] = []

  for (const item of items) {
    const producto = productos?.find((p) => p.id === item.producto_id)

    if (!producto || producto.stock < item.cantidad) {
      return respuestaError(
        409,
        'STOCK_INSUFICIENTE',
        producto
          ? `No hay stock suficiente de "${producto.nombre}". Disponible: ${producto.stock}.`
          : 'Un producto del carrito ya no está disponible.',
        { producto_id: item.producto_id, disponible: producto?.stock ?? 0 }
      )
    }

    lineas.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: item.cantidad,
      subtotal: redondear(Number(producto.precio) * item.cantidad),
    })
  }

  const subtotal = redondear(lineas.reduce((suma, l) => suma + l.subtotal, 0))
  const costoEnvio = Number(zona.costo)

  return respuestaOk<Cotizacion>({
    subtotal,
    costo_envio: costoEnvio,
    total: redondear(subtotal + costoEnvio),
    items: lineas,
  })
})
