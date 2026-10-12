'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface ItemCarrito {
  id: number
  nombre: string
  precio: number
  cantidad: number
  categoria: string
  icono: string
  unidad: string
}

interface CarritoContextType {
  items: ItemCarrito[]
  agregarItem: (producto: Omit<ItemCarrito, 'cantidad'>) => void
  actualizarCantidad: (id: number, cantidad: number) => void
  eliminarItem: (id: number) => void
  total: number
  totalItems: number
  limpiarCarrito: () => void
}

const CarritoContext = createContext<CarritoContextType | null>(null)

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])

  const agregarItem = (producto: Omit<ItemCarrito, 'cantidad'>) => {
    setItems(prev => {
      const existe = prev.find(i => i.id === producto.id)
      if (existe) {
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const actualizarCantidad = (id: number, cantidad: number) => {
    if (cantidad < 1) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad } : i))
  }

  const eliminarItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const limpiarCarrito = () => setItems([])

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const totalItems = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <CarritoContext.Provider value={{ items, agregarItem, actualizarCantidad, eliminarItem, total, totalItems, limpiarCarrito }}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarrito() {
  const context = useContext(CarritoContext)
  if (!context) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return context
}
