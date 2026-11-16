import type { ClientePedido, EventoSeguimiento, FaltantePedido, ItemPedido } from '@/types/comercio'

type ClienteSupabase = Awaited<ReturnType<typeof import('@/lib/api/supabase-servidor').createServerSupabaseClient>>

export const COLUMNAS_PRODUCTO =
  'id, sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono, imagen_url, activo, ' +
  'composicion, cultivos, modo_uso, dosis, banda_toxicologica, precio_referencia, fuente_precio, fecha_precio, tendencia_precio, ' +
  'categorias(nombre, icono)'

export const COLUMNAS_ZONA = 'id, nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega, activo, orden'

export const COLUMNAS_PEDIDO_RESUMEN =
  'id, codigo, usuario_id, estado, estado_pago, metodo_pago, total, created_at, direccion_entrega, telefono_contacto, recoge_nombre, recoge_ci, zonas_envio(nombre, tipo), envios(estado, transportista, numero_guia), pagos(estado)'

export const COLUMNAS_PEDIDO_DETALLE =
  'id, codigo, usuario_id, estado, estado_pago, metodo_pago, subtotal, costo_envio, total, created_at, direccion_entrega, telefono_contacto, recoge_nombre, recoge_ci, notas, zonas_envio(nombre, tipo), pedido_items(id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal), pagos(id, metodo, monto, estado, motivo_rechazo, comprobante_path, revisado_en), envios(id, estado, transportista, numero_guia, despachado_en, entregado_en), seguimiento_pedido(id, estado, nota, created_at)'

// Compatibilidad mientras no se corra la migración 0007: sin las columnas de quién recoge.
// 42703 = columna inexistente en Postgres.
export const sinColumnasRecoge = (columnas: string) => columnas.replace(', recoge_nombre, recoge_ci', '')
export const faltaColumna = (error: { code?: string } | null) => error?.code === '42703'

// Los pedidos apuntan a auth.users, así que los nombres se buscan aparte en perfiles
export async function buscarClientes(supabase: ClienteSupabase, ids: Array<string | null | undefined>) {
  const unicos = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const clientes = new Map<string, ClientePedido>()

  if (unicos.length === 0) return clientes

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, telefono, email')
    .in('id', unicos)

  if (error) throw error

  for (const perfil of data ?? []) {
    clientes.set(perfil.id, { nombre: perfil.nombre, telefono: perfil.telefono, email: perfil.email })
  }

  return clientes
}

const MINUTOS_URL_FIRMADA = 5

export async function firmarComprobante(supabase: ClienteSupabase, ruta: string | null | undefined) {
  if (!ruta) return null

  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(ruta, MINUTOS_URL_FIRMADA * 60)

  if (error) {
    console.error('No se pudo firmar el comprobante:', error.message)
    return null
  }

  return data.signedUrl
}

// Antes de correr la 0017 no existen la función ni la tabla: se sigue sin esos datos
// PGRST202 = función inexistente · 42P01 / PGRST205 = tabla inexistente
const faltaMigracion = (error: { code?: string } | null) =>
  error?.code === 'PGRST202' || error?.code === '42P01' || error?.code === 'PGRST205'

// Línea de tiempo con el nombre de quién hizo cada paso (linea_tiempo_pedido, 0017).
// null si la 0017 no está corrida: se usa la de seguimiento_pedido.
export async function leerLineaTiempo(supabase: ClienteSupabase, pedidoId: string): Promise<EventoSeguimiento[] | null> {
  const { data, error } = await supabase.rpc('linea_tiempo_pedido', { p_pedido_id: pedidoId })
  if (faltaMigracion(error)) return null
  if (error) throw error
  return (data ?? []) as EventoSeguimiento[]
}

// Faltantes del pedido para el admin (la RLS de faltantes_pedido solo deja leer al admin)
export async function leerFaltantes(
  supabase: ClienteSupabase,
  pedidoId: string,
  items: Pick<ItemPedido, 'id' | 'nombre_producto'>[]
): Promise<FaltantePedido[] | undefined> {
  const { data, error } = await supabase
    .from('faltantes_pedido')
    .select('id, pedido_item_id, nota, reportado_por, created_at, resuelto_en, resuelto_por, nota_resolucion')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: true })

  if (faltaMigracion(error)) return undefined
  if (error) throw error

  const filas = data ?? []
  const personas = await buscarClientes(supabase, filas.flatMap((f) => [f.reportado_por, f.resuelto_por]))
  const nombreCorto = (id: string | null) => {
    const nombre = id ? personas.get(id)?.nombre : null
    return nombre ? nombre.trim().split(/\s+/).slice(0, 2).join(' ') : null
  }
  const producto = new Map(items.map((i) => [i.id, i.nombre_producto]))

  return filas.map((f) => ({
    id: f.id,
    pedido_item_id: f.pedido_item_id,
    producto: f.pedido_item_id ? producto.get(f.pedido_item_id) ?? null : null,
    nota: f.nota,
    reportado_por: nombreCorto(f.reportado_por),
    created_at: f.created_at,
    resuelto_en: f.resuelto_en,
    resuelto_por: nombreCorto(f.resuelto_por),
    nota_resolucion: f.nota_resolucion,
  }))
}
