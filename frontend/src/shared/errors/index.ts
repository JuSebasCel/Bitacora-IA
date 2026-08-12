/*
  Catálogo de errores de dominio del frontend.

  Regla de la sección 5 de CLAUDE.md: ningún error queda sin nombre propio, y la
  interfaz nunca muestra el código crudo ni detalle técnico. Cada código conocido
  se traduce a un mensaje accionable en español; cualquier código desconocido cae
  a un mensaje genérico que no filtra información interna.
*/

export type CodigoError =
  /* Acceso y registro (F1). */
  | 'AUTH_CAMPO_REQUERIDO'
  | 'AUTH_CORREO_INVALIDO'
  | 'AUTH_CREDENCIALES_INVALIDAS'
  | 'AUTH_CORREO_YA_REGISTRADO'
  | 'AUTH_FALLO_INESPERADO'
  /* Conferencias y etiquetas personales (F2). */
  | 'CONF_NO_ENCONTRADA'
  | 'CONF_PROCESAMIENTO_FALLIDO'
  | 'ETQ_NOMBRE_REQUERIDO'
  | 'ETQ_YA_EXISTE'
  | 'ETQ_NOMBRE_MUY_LARGO'
  | 'ETQ_NO_EDITABLE'
  /* Carga de conferencia (F3). */
  | 'CARGA_CAMPO_REQUERIDO'
  | 'CARGA_ARCHIVO_REQUERIDO'
  | 'CARGA_ARCHIVO_NO_SOPORTADO'
  | 'CARGA_ARCHIVO_MUY_GRANDE'
  | 'CARGA_FALLO_INESPERADO'
  /* Directorio compartido de eventos y ponentes (F3). */
  | 'DIR_EVENTO_NOMBRE_REQUERIDO'
  | 'DIR_EVENTO_YA_EXISTE'
  | 'DIR_EVENTO_NOMBRE_MUY_LARGO'
  | 'DIR_PONENTE_NOMBRE_REQUERIDO'
  | 'DIR_PONENTE_YA_EXISTE'
  | 'DIR_PONENTE_NOMBRE_MUY_LARGO'

/** Tope de longitud del nombre de una etiqueta: más largo rompe la fila densa del listado. */
export const LARGO_MAXIMO_DE_ETIQUETA = 24

/** Nombres de evento y ponente admiten más largo que una etiqueta: son texto libre real, no un chip. */
export const LARGO_MAXIMO_DE_EVENTO = 80
export const LARGO_MAXIMO_DE_PONENTE = 60

const MENSAJES: Record<CodigoError, string> = {
  AUTH_CAMPO_REQUERIDO: 'Completa todos los campos para continuar.',
  AUTH_CORREO_INVALIDO: 'Ese correo no tiene un formato válido. Revísalo e inténtalo de nuevo.',
  AUTH_CREDENCIALES_INVALIDAS:
    'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.',
  AUTH_CORREO_YA_REGISTRADO:
    'Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.',
  AUTH_FALLO_INESPERADO: 'No pudimos completar la acción. Vuelve a intentarlo en unos momentos.',

  /*
    Este mensaje cubre a propósito dos situaciones: la conferencia no existe, o
    existe y no está compartida con quien la pide. Distinguirlas convertiría el
    detalle en una forma de averiguar qué subió otra persona, en contra de la
    regla de aislamiento por fila de PLAN.md sección 6.3.
  */
  CONF_NO_ENCONTRADA:
    'No encontramos esa conferencia entre las tuyas ni entre las compartidas contigo.',
  CONF_PROCESAMIENTO_FALLIDO:
    'El procesamiento de esta conferencia se interrumpió, así que todavía no tiene fichas. Vuelve a cargarla para reintentarlo.',
  ETQ_NOMBRE_REQUERIDO: 'Escribe un nombre para la etiqueta antes de crearla.',
  ETQ_YA_EXISTE: 'Ya tienes una etiqueta con ese nombre. Elígela de la lista o usa otro nombre.',
  ETQ_NOMBRE_MUY_LARGO: `El nombre de la etiqueta admite hasta ${LARGO_MAXIMO_DE_ETIQUETA} caracteres. Acórtalo para guardarlo.`,
  ETQ_NO_EDITABLE:
    'Esa etiqueta la puso quien te compartió la conferencia, así que solo esa persona puede quitarla.',

  CARGA_CAMPO_REQUERIDO: 'Completa el título, el ponente, el evento y la fecha antes de continuar.',
  CARGA_ARCHIVO_REQUERIDO: 'Elige el archivo de audio o transcripción antes de continuar.',
  CARGA_ARCHIVO_NO_SOPORTADO:
    'Ese archivo no tiene un formato admitido para la fuente elegida. Revísalo e inténtalo de nuevo.',
  CARGA_ARCHIVO_MUY_GRANDE: 'Ese archivo supera el tamaño máximo admitido. Usa uno más liviano.',
  CARGA_FALLO_INESPERADO: 'No pudimos recibir la conferencia. Vuelve a intentarlo en unos momentos.',

  DIR_EVENTO_NOMBRE_REQUERIDO: 'Escribe un nombre para el evento antes de crearlo.',
  DIR_EVENTO_YA_EXISTE: 'Ya existe un evento con ese nombre. Elígelo de la lista o usa otro nombre.',
  DIR_EVENTO_NOMBRE_MUY_LARGO: `El nombre del evento admite hasta ${LARGO_MAXIMO_DE_EVENTO} caracteres. Acórtalo para guardarlo.`,
  DIR_PONENTE_NOMBRE_REQUERIDO: 'Escribe un nombre para el ponente antes de crearlo.',
  DIR_PONENTE_YA_EXISTE:
    'Ese ponente ya está registrado en este evento. Elígelo de la lista o usa otro nombre.',
  DIR_PONENTE_NOMBRE_MUY_LARGO: `El nombre del ponente admite hasta ${LARGO_MAXIMO_DE_PONENTE} caracteres. Acórtalo para guardarlo.`,
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
