// Reglas de validación compartidas entre el navegador y la API (sin dependencias).

// CI boliviano: 5 a 10 dígitos y complemento opcional, ej.: 1234567, 1234567-1B, 1234567 CH.
// Es la misma regla que aplica la base (migración 0007).
export const REGEX_CI = /^[0-9]{5,10}([ -]?[0-9A-Za-z]{1,3})?$/

export const REGEX_TELEFONO = /^[0-9+() -]{7,20}$/
