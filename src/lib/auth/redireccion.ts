// Valida el destino de "?siguiente=" para que solo lleve a rutas internas.
// Un "//sitio.com", "/\sitio.com" o "https://…" llevaría a otro dominio.
export function rutaInterna(valor: string | null | undefined, porDefecto = '/'): string {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return porDefecto
  // Sin caracteres de control (tabulaciones o saltos que el navegador ignora)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(valor)) return porDefecto
  try {
    const url = new URL(valor, 'http://aml.local')
    if (url.origin !== 'http://aml.local') return porDefecto
    // No tiene sentido volver a las pantallas de acceso
    if (url.pathname.startsWith('/auth/')) return porDefecto
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return porDefecto
  }
}
