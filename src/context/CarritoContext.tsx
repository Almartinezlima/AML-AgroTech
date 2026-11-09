'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Producto } from '@/types/comercio'

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
}

const CarritoContext = createContext<CarritoContextType | null>(null)

const CLAVE_CARRITO = 'aml-carrito-v1'

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

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [cargado, setCargado] = useState(false)

  // Se lee después de montar para que el servidor y el navegador coincidan
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? '[]') as unknown
      if (Array.isArray(guardado)) setItems(guardado.filter(esItemValido))
    } catch {
      // Sin almacenamiento disponible, el carrito funciona solo en memoria
    }
    setCargado(true)
  }, [])

  useEffect(() => {
    if (!cargado) return
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items))
    } catch {
      // Sin almacenamiento disponible, el carrito funciona solo en memoria
    }
  }, [items, cargado])

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

  const limpiarCarrito = () => setItems([])

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <CarritoContext.Provider value={{ items, agregarItem, actualizarCantidad, eliminarItem, ajustarStock, total, totalItems, limpiarCarrito }}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return context
}
