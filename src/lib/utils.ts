// Fecha de hoy en la hora local del navegador, en formato AAAA-MM-DD.
// No usar toISOString(): convierte a UTC y en Bolivia (UTC-4) puede dar el día siguiente.
export function fechaHoyLocal(): string {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

// Formatea un monto como "Bs. 1.234,50".
// Se arma a mano para que el servidor y el navegador den exactamente lo mismo.
export function formatoBs(monto: number | string): string {
  const numero = Number(monto)
  const seguro = Number.isFinite(numero) ? numero : 0
  const [entero, decimales] = Math.abs(seguro).toFixed(2).split('.')
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const signo = seguro < 0 ? '-' : ''
  return `${signo}Bs. ${conMiles},${decimales}`
}
