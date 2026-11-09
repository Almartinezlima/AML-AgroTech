import type { ClientePedido } from '@/types/comercio'

type ClienteSupabase = Awaited<ReturnType<typeof import('@/lib/api/supabase-servidor').createServerSupabaseClient>>

export const COLUMNAS_PRODUCTO =
  'id, sku, nombre, descripcion, precio, stock, stock_minimo, unidad, categoria_id, icono, imagen_url, activo, categorias(nombre, icono)'

export const COLUMNAS_ZONA = 'id, nombre, tipo, costo, dias_min, dias_max, permite_contra_entrega, activo, orden'

export const COLUMNAS_PEDIDO_RESUMEN =
  'id, codigo, usuario_id, estado, estado_pago, metodo_pago, total, created_at, direccion_entrega, telefono_contacto, zonas_envio(nombre, tipo), envios(estado, transportista, numero_guia), pagos(estado)'

export const COLUMNAS_PEDIDO_DETALLE =
  'id, codigo, usuario_id, estado, estado_pago, metodo_pago, subtotal, costo_envio, total, created_at, direccion_entrega, telefono_contacto, notas, zonas_envio(nombre, tipo), pedido_items(id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal), pagos(id, metodo, monto, estado, motivo_rechazo, comprobante_path, revisado_en), envios(id, estado, transportista, numero_guia, despachado_en, entregado_en), seguimiento_pedido(id, estado, nota, created_at)'

// Los pedidos apuntan a auth.users, así que los nombres se buscan aparte en perfiles
export async function buscarClientes(supabase: ClienteSupabase, ids: Array<string | null | undefined>) {
  const unicos = Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
  const clientes = new Map<string, ClientePedido>()

  if (unicos.length === 0) return clientes

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, telefono')
    .in('id', unicos)

  if (error) throw error

  for (const perfil of data ?? []) {
    clientes.set(perfil.id, { nombre: perfil.nombre, telefono: perfil.telefono })
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
