export default function SkeletonUsuarios() {
  return (
    <div className="animate-pulse" role="status" aria-label="Cargando usuarios">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-tarjeta border border-borde rounded-xl h-24" />
        ))}
      </div>
      <div className="bg-tarjeta border border-borde rounded-xl h-12 mb-6" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-tarjeta border border-borde rounded-xl h-20" />
        ))}
      </div>
    </div>
  )
}
