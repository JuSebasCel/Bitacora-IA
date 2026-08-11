/*
  Utilidades de credenciales de la sesión simulada.

  Las cuentas creadas durante el uso se conservan entre recargados, y para eso
  hay que poder verificar su contraseña más tarde. Guardar la contraseña en
  claro está prohibido por la sección 4 de CLAUDE.md, así que lo que se
  persiste es su resumen SHA-256: alcanza para comparar, y no permite recuperar
  el original.
*/

/*
  Comprobación de forma, no de existencia: algo antes de la arroba, algo
  después, y un dominio de al menos dos caracteres. No se persigue el RFC 5322
  completo, que en la práctica rechaza correos válidos y acepta basura.
*/
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function esCorreoValido(correo: string): boolean {
  return FORMA_DE_CORREO.test(correo.trim())
}

/*
  Devuelve el resumen hexadecimal de la contraseña, o null si el entorno no
  expone WebCrypto (contexto no seguro). Quien llame debe tratar el null como
  un fallo, nunca continuar guardando la contraseña en claro.
*/
export async function resumirContrasena(contrasena: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    return null
  }

  try {
    const datos = new TextEncoder().encode(contrasena)
    const resumen = await subtle.digest('SHA-256', datos)

    return Array.from(new Uint8Array(resumen))
      .map((octeto) => octeto.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}
