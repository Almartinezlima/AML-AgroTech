'use client'
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { Producto } from '@/types/comercio'
import { useAuth } from '@/context/AuthContext'

export interface ItemCarrito {
  id: string
  nombre: string
  precio: number
  cantidad: number
  categoria: string
  icono: string
  unidad: string
  stock: number
  imagen_url?: string | null
}

interface CarritoContextType {
  items: ItemCarrito[]
  agregarItem: (producto: Omit<ItemCarrito, 'cantidad'>, cantidad?: number) => void
  actualizarCantidad: (id: string, cantidad: number) => void
  eliminarItem: (id: string) => void
  ajustarStock: (id: string, disponible: number) => void
  total: number
  totalItems: number
  limpiarCarrito: () => void
  // false mientras se lee el carrito guardado de la cuenta
  listo: boolean
}

const CarritoContext = createContext<CarritoContextType | null>(null)

// Cada cuenta tiene su propio carrito en este navegador: al cambiar de cuenta
// nunca se ve ni se compra lo que dejó otra persona.
const PREFIJO_CARRITO = 'aml-carrito-v2:'
const CLAVE_INVITADO = `${PREFIJO_CARRITO}invitado`
// Versión vieja, compartida por todas las cuentas: se descarta
const CLAVE_ANTIGUA = 'aml-carrito-v1'

const claveDe = (userId: string | null) => (userId ? `${PREFIJO_CARRITO}${userId}` : CLAVE_INVITADO)

function esItemValido(valor: unknown): valor is ItemCarrito {
  const item = valor as ItemCarrito
  return Boolean(item)
    && typeof item.id === 'string'
    && typeof item.nombre === 'string'
    && Number.isFinite(item.precio)
    && Number.isInteger(item.cantidad) && item.cantidad >= 1
    && Number.isInteger(item.stock)
}

export function productoParaCarrito(producto: Producto): Omit<ItemCarrito, 'cantidad'> {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    categoria: producto.categorias?.nombre || '',
    icono: producto.icono ?? '📦',
    unidad: producto.unidad,
    stock: producto.stock,
    imagen_url: producto.imagen_url,
  }
}

const limitar = (cantidad: number, stock: number) => Math.max(1, Math.min(cantidad, stock))

// null = el navegador no deja leer (el carrito funciona solo en memoria)
function leerGuardado(clave: string): ItemCarrito[] | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave) ?? '[]') as unknown
    return Array.isArray(guardado) ? guardado.filter(esItemValido) : []
  } catch {
    return null
  }
}

const leerCarrito = (clave: string) => leerGuardado(clave) ?? []

function guardarCarrito(clave: string, items: ItemCarrito[]) {
  try {
    localStorage.setItem(clave, JSON.stringify(items))
  } catch {
    // Sin almacenamiento disponible, el carrito funciona solo en memoria
  }
}

function borrarCarrito(clave: string) {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento disponible no hay nada que borrar
  }
}

// Suma lo que juntó como invitado al carrito de su cuenta, respetando el stock
function fusionar(base: ItemCarrito[], extra: ItemCarrito[]): ItemCarrito[] {
  const resultado = [...base]
  for (const item of extra) {
    const i = resultado.findIndex((r) => r.id === item.id)
    if (i === -1) resultado.push(item)
    else resultado[i] = { ...item, cantidad: limitar(resultado[i].cantidad + item.cantidad, item.stock) }
  }
  return resultado
}

interface EstadoCarrito {
  clave: string | null
  items: ItemCarrito[]
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const { user, cargando: cargandoAuth } = useAuth()
  const userId = user?.id ?? null
  // La clave y los ítems cambian juntos: así nunca se guarda un carrito con la clave de otra cuenta
  const [estado, setEstado] = useState<EstadoCarrito>({ clave: null, items: [] })
  const claveAnterior = useRef<string | null>(null)
  const items = estado.items

  // Se lee después de montar (para que el servidor y el navegador coincidan) y cada vez que cambia la cuenta
  useEffect(() => {
    if (cargandoAuth) return
    const clave = claveDe(userId)
    if (claveAnterior.current === clave) return

    let cargados = leerCarrito(clave)
    if (userId) {
      const delInvitado = leerCarrito(CLAVE_INVITADO)
      if (delInvitado.length > 0) {
        cargados = fusionar(cargados, delInvitado)
        borrarCarrito(CLAVE_INVITADO)
      }
    }
    borrarCarrito(CLAVE_ANTIGUA)

    claveAnterior.current = clave
    // Lo fusionado del invitado queda guardado en la cuenta
    guardarCarrito(clave, cargados)
    setEstado({ clave, items: cargados })
  }, [userId, cargandoAuth])

  // Lo guardado en el navegador manda. Se relee cuando:
  // - otra pestaña cambió el carrito de esta cuenta (evento storage);
  // - la página vuelve con Atrás desde la memoria del navegador (pageshow persisted): sin esto
  //   mostraría los productos de antes de comprar;
  // - la pestaña vuelve a estar visible.
  // Releer no guarda nada, así que una página vieja nunca reescribe un carrito ya comprado.
  useEffect(() => {
    if (!estado.clave) return
    const clave = estado.clave
    const releer = () => {
      const guardado = leerGuardado(clave)
      if (guardado) setEstado({ clave, items: guardado })
    }
    const alCambiar = (evento: StorageEvent) => { if (evento.key === clave) releer() }
    const alMostrar = (evento: PageTransitionEvent) => { if (evento.persisted) releer() }
    const alVolver = () => { if (document.visibilityState === 'visible') releer() }
    window.addEventListener('storage', alCambiar)
    window.addEventListener('pageshow', alMostrar)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('storage', alCambiar)
      window.removeEventListener('pageshow', alMostrar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [estado.clave])

  // Solo los cambios de la persona (agregar, quitar, cantidad, vaciar) se guardan, y en el
  // mismo momento: no se espera a un efecto que podría correr tarde o desde una página vieja.
  const setItems = (cambio: (prev: ItemCarrito[]) => ItemCarrito[]) => {
    setEstado((prev) => {
      const items = cambio(prev.items)
      if (prev.clave) guardarCarrito(prev.clave, items)
      return { ...prev, items }
    })
  }

  const agregarItem = (producto: Omit<ItemCarrito, 'cantidad'>, cantidad = 1) => {
    if (producto.stock < 1) return
    setItems(prev => {
      const existe = prev.find(i => i.id === producto.id)
      if (existe) {
        return prev.map(i => i.id === producto.id
          ? { ...i, ...producto, cantidad: limitar(i.cantidad + cantidad, producto.stock) }
          : i)
      }
      return [...prev, { ...producto, cantidad: limitar(cantidad, producto.stock) }]
    })
  }

  const actualizarCantidad = (id: string, cantidad: number) => {
    if (cantidad < 1) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: limitar(cantidad, i.stock) } : i))
  }

  const eliminarItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  // Cuando el servidor avisa que ya no hay tanto stock
  const ajustarStock = (id: string, disponible: number) => {
    setItems(prev => disponible < 1
      ? prev.filter(i => i.id !== id)
      : prev.map(i => i.id === id ? { ...i, stock: disponible, cantidad: Math.min(i.cantidad, disponible) } : i))
  }

  // Se llama solo cuando el pedido ya se creó: vacía la memoria y lo guardado a la vez
  const limpiarCarrito = () => setItems(() => [])

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <CarritoContext.Provider value={{ items, agregarItem, actualizarCantidad, eliminarItem, ajustarStock, total, totalItems, limpiarCarrito, listo: estado.clave !== null }}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return context
}
