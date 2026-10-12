export default function Footer() {
  return (
    <footer className="bg-[#111811] border-t border-[#1a2e1a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#22c55e] text-xl">🌱</span>
            <span className="font-bold text-[#f0fdf4]">AML <span className="text-[#22c55e]">AgroTech</span></span>
          </div>
          <p className="text-[#86efac] text-sm">
            © 2026 AML AgroTech — Sucre, Bolivia. Todos los derechos reservados.
          </p>
          <p className="text-[#86efac] text-sm">
            Insumos agrícolas al alcance de tu mano 🌿
          </p>
        </div>
      </div>
    </footer>
  )
}
