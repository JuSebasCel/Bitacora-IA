/*
  Catálogo de errores de dominio del frontend.

  Regla de la sección 5 de CLAUDE.md: ningún error queda sin nombre propio, y la
  interfaz nunca muestra el código crudo ni detalle técnico. Cada código conocido
  se traduce a un mensaje accionable en español; cualquier código desconocido cae
  a un mensaje genérico que no filtra información interna.
*/

export type CodigoError =
  | 'AUTH_CAMPO_REQUERIDO'
  | 'AUTH_CORREO_INVALIDO'
  | 'AUTH_CREDENCIALES_INVALIDAS'
  | 'AUTH_CORREO_YA_REGISTRADO'
  | 'AUTH_FALLO_INESPERADO'

const MENSAJES: Record<CodigoError, string> = {
  AUTH_CAMPO_REQUERIDO: 'Completa todos los campos para continuar.',
  AUTH_CORREO_INVALIDO: 'Ese correo no tiene un formato válido. Revísalo e inténtalo de nuevo.',
  AUTH_CREDENCIALES_INVALIDAS:
    'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.',
  AUTH_CORREO_YA_REGISTRADO:
    'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.',
  AUTH_FALLO_INESPERADO: 'No pudimos completar la acción. Vuelve a intentarlo en unos momentos.',
}

const MENSAJE_GENERICO = 'No pudimos completar la acción. Vuelve a intentarlo en unos momentos.'

/*
  Lista de códigos conocidos, útil para recorrer el catálogo completo en pruebas
  y en herramientas de diagnóstico sin duplicar la definición del tipo.
*/
export const CODIGOS_DE_ERROR = Object.keys(MENSAJES) as readonly CodigoError[]

function esCodigoConocido(codigo: string): codigo is CodigoError {
  return Object.prototype.hasOwnProperty.call(MENSAJES, codigo)
}

export function mensajeDeError(codigo: string): string {
  if (!esCodigoConocido(codigo)) {
    return MENSAJE_GENERICO
  }

  return MENSAJES[codigo]
}
