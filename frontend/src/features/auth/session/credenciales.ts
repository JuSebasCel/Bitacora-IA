/*
  Comprobación de forma, no de existencia: algo antes de la arroba, algo
  después, y un dominio de al menos dos caracteres. No se persigue el RFC 5322
  completo, que en la práctica rechaza correos válidos y acepta basura.

  Sirve como validación rápida antes del viaje de red a Supabase Auth (B1):
  falla al instante en vez de esperar la respuesta del servidor por un typo
  obvio.
*/
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function esCorreoValido(correo: string): boolean {
  return FORMA_DE_CORREO.test(correo.trim())
}
