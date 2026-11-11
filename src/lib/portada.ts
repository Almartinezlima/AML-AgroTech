// Foto de portada: campo de papa en Villa Charcas al atardecer, foto propia de Aldo Martínez Lima (marca AML).
// Archivo en public/portada/villa-charcas.webp. Fuentes de todas las fotos: docs/CREDITOS_IMAGENES.md
export interface CreditoFoto {
  autor: string
  enlace: string
}

export const CREDITO_FOTO_PORTADA: CreditoFoto = {
  autor: 'Aldo Martínez Lima',
  enlace: 'https://github.com/Almartinezlima/AML-AgroTech/blob/master/docs/CREDITOS_IMAGENES.md#portada',
}

// Repositorio público con el detalle de licencias de cada foto
export const ENLACE_CREDITOS = 'https://github.com/Almartinezlima/AML-AgroTech/blob/master/docs/CREDITOS_IMAGENES.md'
