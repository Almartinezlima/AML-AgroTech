'use client'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'
import './swagger-legible.css'

// Swagger UI solo funciona en el navegador
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p className="text-texto-2 text-center py-20">Cargando documentación...</p>,
})

export default function ApiDocsPage() {
  return (
    <div className="bg-white min-h-screen py-4">
      <SwaggerUI url="/api/openapi" docExpansion="list" />
    </div>
  )
}
