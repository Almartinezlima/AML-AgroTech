'use client'
import { useState } from 'react'
import EncabezadoAdmin from '@/components/admin/EncabezadoAdmin'
import InterruptorPruebas, { useMostrarPruebas } from '@/components/admin/InterruptorPruebas'
import PestanasAbastecimiento from '@/components/admin/PestanasAbastecimiento'
import { clasePagina } from '@/components/ui/estilos'
import PasosAyuda from '@/components/ui/PasosAyuda'
import ListaOrdenes from './_components/ListaOrdenes'
import ListaReponer from './_components/ListaReponer'

// Abastecimiento: qué reponer (con el proveedor más barato) y las órdenes de compra
export default function AbastecimientoPage() {
  const pruebas = useMostrarPruebas()
  // Al armar órdenes se recarga la lista de abajo
  const [version, setVersion] = useState(0)

  return (
    <div className={clasePagina}>
      <div className="mx-auto max-w-5xl">
        <EncabezadoAdmin
          titulo="Abastecimiento"
          descripcion="Lo que hay que reponer, con el proveedor más barato, y las órdenes de compra."
          acciones={<InterruptorPruebas mostrar={pruebas.mostrar} onCambiar={pruebas.setMostrar} />}
        />
        <PestanasAbastecimiento />

        <PasosAyuda
          pasos={[
            <>En «Para reponer» ya vienen marcados los productos con poco stock, con el proveedor más barato y la cantidad sugerida.</>,
            <>Ajusta lo que haga falta y toca «Armar orden». Queda en borrador, una por proveedor.</>,
            <>Abre la orden y toca «Enviar al proveedor». Él la acepta y la despacha.</>,
            <>Cuando llegue la mercadería, abre la orden y toca «Recibir»: el stock se suma solo.</>,
          ]}
        />

        <ListaReponer onArmadas={() => setVersion((v) => v + 1)} />

        <ListaOrdenes key={version} mostrarPruebas={pruebas.mostrar} listo={pruebas.listo} />
      </div>
    </div>
  )
}
