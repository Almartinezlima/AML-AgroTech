import { claseBoton } from '@/components/ui/estilos'
import { enlaceLlamar, enlaceWhatsApp } from '@/lib/entrega/presentacion'
import { LuMessageCircle, LuPhone } from 'react-icons/lu'

// Llamar y WhatsApp al cliente: dos botones grandes lado a lado (repartidor, fase 9D)
export default function ContactoCliente({ telefono, codigoPedido }: { telefono: string | null; codigoPedido: string }) {
  if (!telefono) return <p className="text-sm text-texto-2">Sin teléfono de contacto.</p>

  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={enlaceLlamar(telefono)} className={`${claseBoton('secundario')} min-h-14 px-3`}>
        <LuPhone className="h-5 w-5" aria-hidden="true" /> Llamar
      </a>
      <a href={enlaceWhatsApp(telefono, codigoPedido)} target="_blank" rel="noopener noreferrer" className={`${claseBoton('suave')} min-h-14 px-3`}>
        <LuMessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp
      </a>
    </div>
  )
}
