import Link from 'next/link'
import ProductosDestacados from './_components/ProductosDestacados'

const categorias = [
  { nombre: 'Agroquímicos', icono: '🧪', descripcion: 'Fertilizantes, pesticidas y herbicidas' },
  { nombre: 'Riego', icono: '💧', descripcion: 'Sistemas de riego tecnificado' },
  { nombre: 'Cañerías', icono: '🔧', descripcion: 'Tuberías y accesorios' },
  { nombre: 'Herramientas', icono: '⚒️', descripcion: 'Equipos y herramientas agrícolas' },
  { nombre: 'Semillas', icono: '🌱', descripcion: 'Semillas certificadas de calidad' },
]

export default function Home() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0a0f0a] via-[#0d1a0d] to-[#0a0f0a] py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#111811] border border-[#22c55e] rounded-full px-4 py-2 mb-6">
            <span className="text-[#22c55e] text-sm font-medium">🌿 Plataforma agrícola boliviana</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-[#f0fdf4] mb-6">
            Insumos agrícolas<br />
            <span className="text-[#22c55e]">al alcance de tu mano</span>
          </h1>
          <p className="text-[#86efac] text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Encuentra agroquímicos, sistemas de riego, herramientas y semillas de calidad.
            Compra en línea desde cualquier lugar de Bolivia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/catalogo" className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold px-8 py-4 rounded-xl text-lg transition-colors">
              Ver Catálogo →
            </Link>
            <Link href="/auth/registro" className="border border-[#22c55e] text-[#22c55e] hover:bg-[#111811] font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-16 px-4 bg-[#0a0f0a]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#f0fdf4] text-center mb-4">Nuestras Categorías</h2>
          <p className="text-[#86efac] text-center mb-12">Todo lo que necesitas para tu campo en un solo lugar</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categorias.map((cat) => (
              <Link key={cat.nombre} href={`/catalogo?categoria=${cat.nombre}`}
                className="bg-[#111811] border border-[#1a2e1a] hover:border-[#22c55e] rounded-xl p-6 text-center transition-all hover:bg-[#162016] group">
                <div className="text-4xl mb-3">{cat.icono}</div>
                <h3 className="font-semibold text-[#f0fdf4] group-hover:text-[#22c55e] transition-colors mb-1">{cat.nombre}</h3>
                <p className="text-[#86efac] text-xs">{cat.descripcion}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="py-16 px-4 bg-[#0d1a0d]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-[#f0fdf4]">Productos Destacados</h2>
              <p className="text-[#86efac] mt-2">Una selección de nuestro catálogo</p>
            </div>
            <Link href="/catalogo" className="text-[#22c55e] hover:text-[#16a34a] font-semibold transition-colors">
              Ver todos →
            </Link>
          </div>
          <ProductosDestacados />
        </div>
      </section>

      {/* Banner CTA */}
      <section className="py-16 px-4 bg-[#0a0f0a]">
        <div className="max-w-4xl mx-auto bg-[#111811] border border-[#22c55e] rounded-2xl p-10 text-center">
          <h2 className="text-3xl font-bold text-[#f0fdf4] mb-4">¿Eres distribuidor?</h2>
          <p className="text-[#86efac] mb-8 text-lg">Registra tu negocio y llega a más agricultores en toda Bolivia</p>
          <Link href="/auth/registro" className="bg-[#22c55e] hover:bg-[#16a34a] text-[#0a0f0a] font-bold px-8 py-4 rounded-xl text-lg transition-colors">
            Unirse como distribuidor
          </Link>
        </div>
      </section>

    </div>
  )
}
