// Interfaz de gestión de usuarios. La conexión con base de datos real se hará en la siguiente fase.
export default function UsuariosAdminPage() {
  return (
    <div className="min-h-screen bg-[#0a0f0a] py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f0fdf4]">Usuarios registrados</h1>
          <p className="text-[#86efac] mt-1">Gestión de cuentas de clientes y distribuidores</p>
        </div>

        {/* Cards resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#86efac] text-sm">Total usuarios</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-[#f0fdf4]">87</div>
          </div>
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#86efac] text-sm">Clientes</span>
              <span className="text-2xl">👤</span>
            </div>
            <div className="text-3xl font-bold text-[#22c55e]">65</div>
          </div>
          <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#86efac] text-sm">Distribuidores</span>
              <span className="text-2xl">🚚</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">18</div>
          </div>
        </div>

        {/* Mensaje informativo */}
        <div className="bg-[#111811] border border-[#22c55e] rounded-xl p-4 mb-6">
          <p className="text-[#86efac] text-sm">
            ℹ️ Los usuarios se registran desde la plataforma. Aquí puedes gestionar sus roles y accesos.
          </p>
        </div>

        {/* Tabla de usuarios (vacía por ahora) */}
        <div className="bg-[#111811] border border-[#1a2e1a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a2e1a]">
                  <th className="text-left text-[#86efac] text-xs px-5 py-3">Nombre</th>
                  <th className="text-left text-[#86efac] text-xs px-5 py-3">Email</th>
                  <th className="text-left text-[#86efac] text-xs px-5 py-3">Rol</th>
                  <th className="text-left text-[#86efac] text-xs px-5 py-3 hidden sm:table-cell">Teléfono</th>
                  <th className="text-left text-[#86efac] text-xs px-5 py-3 hidden md:table-cell">Fecha registro</th>
                  <th className="text-left text-[#86efac] text-xs px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>

          {/* Estado vacío */}
          <div className="text-center py-16">
            <span className="text-6xl">👥</span>
            <p className="text-[#86efac] mt-4 text-lg">Aún no hay usuarios registrados</p>
          </div>
        </div>

      </div>
    </div>
  )
}
