'use client'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

// Swagger UI solo funciona en el navegador
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p className="text-[#86efac] text-center py-20">Cargando documentación...</p>,
})

export default function ApiDocsPage() {
  return (
    <div className="bg-white min-h-screen">
      <SwaggerUI url="/api/openapi" docExpansion="list" />
    </div>
  )
}
