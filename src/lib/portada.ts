// Foto de portada: terrazas de cultivo en un valle andino (Unsplash, licencia Unsplash).
// Archivo en public/portada/valle-andino.webp. Fuentes de todas las fotos: docs/CREDITOS_IMAGENES.md
export interface CreditoFoto {
  autor: string
  enlace: string
}

export const CREDITO_FOTO_PORTADA: CreditoFoto = {
  autor: 'Arnaud Courtecuisse',
  enlace: 'https://unsplash.com/photos/terraced-fields-in-a-mountainous-landscape-under-a-clear-sky-aE5jL7VX2r0',
}

// Repositorio público con el detalle de licencias de cada foto
export const ENLACE_CREDITOS = 'https://github.com/Almartinezlima/AML-AgroTech/blob/master/docs/CREDITOS_IMAGENES.md'
