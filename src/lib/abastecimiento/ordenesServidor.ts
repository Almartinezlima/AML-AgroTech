import { ErrorApi } from '@/lib/api/respuestas'
import type { SesionApi } from '@/lib/api/sesion'
import { esCorreoPrueba } from '@/lib/pruebas'
import type {
  EventoOrdenCompra, LineaOrdenAdmin, LineaOrdenCompra, OrdenCompra, OrdenCompraAdmin, OrdenCompraDetalle, Presentacion,
} from '@/types/abastecimiento'
import {
  COLUMNAS_LINEA_ORDEN, COLUMNAS_ORDEN, COLUMNAS_PRESENTACION, COLUMNAS_SEGUIMIENTO_ORDEN, migracionPendiente,
} from './consultas'

// Lógica de servidor de las órdenes de compra. No importar desde el navegador.

type Cliente = SesionApi['supabase']

// Llama a una función de la 0015. Los errores AML (estado, permiso, datos) los traduce manejarError.
export async function llamarFuncionOrden<T = unknown>(supabase: Cliente, funcion: string, argumentos: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(funcion, argumentos)
  if (error) throw migracionPendiente(error)
  return data as T
}

const noExiste = () => new ErrorApi(404, 'NO_ENCONTRADO', 'La orden no existe.')

async function lineasYSeguimiento(supabase: Cliente, id: string) {
  const [lineas, seguimiento] = await Promise.all([
    supabase.from('orden_compra_items').select(COLUMNAS_LINEA_ORDEN).eq('orden_compra_id', id).order('created_at'),
    supabase.from('seguimiento_orden_compra').select(COLUMNAS_SEGUIMIENTO_ORDEN).eq('orden_compra_id', id).order('created_at'),
  ])
  if (lineas.error) throw migracionPendiente(lineas.error)
  if (seguimiento.error) throw migracionPendiente(seguimiento.error)
  return {
    lineas: lineas.data as unknown as LineaOrdenCompra[],
    seguimiento: seguimiento.data as unknown as EventoOrdenCompra[],
  }
}

// Vista del proveedor: solo sus órdenes y nunca los borradores (además de la RLS).
// Sin stock, sin costos, sin clientes: solo lo que él vende y a qué precio.
export async function ordenParaProveedor(supabase: Cliente, id: string, distribuidorId: string): Promise<OrdenCompraDetalle> {
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select(COLUMNAS_ORDEN)
    .eq('id', id)
    .eq('distribuidor_id', distribuidorId)
    .neq('estado', 'borrador')
    .maybeSingle()

  if (error) throw migracionPendiente(error)
  if (!data) throw noExiste()

  const { lineas, seguimiento } = await lineasYSeguimiento(supabase, id)
  return {
    ...(data as unknown as OrdenCompra),
    // Las líneas quitadas del borrador no se mandaron: no son parte de la orden
    lineas: lineas.filter((l) => l.cantidad > 0),
    seguimiento: seguimiento.filter((e) => e.estado !== 'borrador'),
  }
}

type FilaOrdenAdmin = OrdenCompra & { distribuidor: (OrdenCompra['distribuidor'] & { cuenta: { email: string } | null }) | null }

// Vista del admin: además, stock y costo de cada producto (para la recepción) y, en
// borrador, las presentaciones del proveedor que se pueden sumar.
export async function ordenParaAdmin(supabase: Cliente, id: string): Promise<OrdenCompraAdmin> {
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select(COLUMNAS_ORDEN.replace('telefono)', 'telefono, cuenta:perfiles(email))'))
    .eq('id', id)
    .maybeSingle()

  if (error) throw migracionPendiente(error)
  if (!data) throw noExiste()

  const fila = data as unknown as FilaOrdenAdmin
  const { lineas, seguimiento } = await lineasYSeguimiento(supabase, id)
  const productos = Array.from(new Set(lineas.map((l) => l.producto_id)))

  const [stock, costos, disponibles] = await Promise.all([
    productos.length
      ? supabase.from('productos').select('id, stock').in('id', productos)
      : Promise.resolve({ data: [], error: null }),
    productos.length
      ? supabase.from('costos_producto').select('producto_id, costo_promedio').in('producto_id', productos)
      : Promise.resolve({ data: [], error: null }),
    fila.estado === 'borrador'
      ? supabase
          .from('presentaciones_distribuidor')
          .select(COLUMNAS_PRESENTACION)
          .eq('distribuidor_id', fila.distribuidor_id)
          .eq('activo', true)
          .eq('disponible', true)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (stock.error) throw stock.error
  if (costos.error) throw costos.error
  if (disponibles.error) throw disponibles.error

  const stockDe = new Map((stock.data as { id: string; stock: number }[]).map((p) => [p.id, p.stock]))
  const costoDe = new Map((costos.data as { producto_id: string; costo_promedio: number }[]).map((c) => [c.producto_id, Number(c.costo_promedio)]))

  const { cuenta, ...distribuidor } = fila.distribuidor ?? { cuenta: null }
  const lineasAdmin: LineaOrdenAdmin[] = lineas.map((l) => ({
    ...l,
    stock: stockDe.get(l.producto_id) ?? 0,
    costo_promedio: costoDe.get(l.producto_id) ?? null,
  }))

  return {
    ...fila,
    distribuidor: fila.distribuidor ? (distribuidor as OrdenCompra['distribuidor']) : null,
    es_prueba: esCorreoPrueba(cuenta?.email),
    // Desde que se envía, las líneas en 0 ya no son parte de la orden
    lineas: fila.estado === 'borrador' ? lineasAdmin : lineasAdmin.filter((l) => l.cantidad > 0),
    seguimiento,
    presentaciones_disponibles: (disponibles.data as unknown as Presentacion[]).sort((a, b) =>
      (a.productos?.nombre ?? '').localeCompare(b.productos?.nombre ?? '', 'es')
    ),
  }
}
