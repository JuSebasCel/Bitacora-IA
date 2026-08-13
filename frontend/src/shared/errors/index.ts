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
  /* Editor de plantillas (F4). */
  | 'PLANT_NOMBRE_REQUERIDO'
  | 'PLANT_NOMBRE_MUY_LARGO'
  | 'PLANT_NO_ENCONTRADA'
  | 'PLANT_IMAGEN_NO_SOPORTADA'
  | 'PLANT_IMAGEN_MUY_GRANDE'
  | 'PLANT_DOCX_NO_SOPORTADO'
  | 'PLANT_DOCX_MUY_GRANDE'
  | 'PLANT_DOCX_FALLO_IMPORTACION'
  | 'PLANT_DOCX_FALLO_GENERACION'
  | 'PLANT_ETIQUETA_REQUERIDA'
  /* Generador de memoria (F5). */
  | 'MEM_CONFERENCIA_REQUERIDA'
  | 'MEM_PLANTILLA_REQUERIDA'
  | 'MEM_NOMBRE_REQUERIDO'
  | 'MEM_NOMBRE_MUY_LARGO'
  | 'MEM_NO_ENCONTRADA'
  | 'MEM_FALLO_GENERACION'

/** Tope de longitud del nombre de una etiqueta: más largo rompe la fila densa del listado. */
export const LARGO_MAXIMO_DE_ETIQUETA = 24

/** Nombres de evento y ponente admiten más largo que una etiqueta: son texto libre real, no un chip. */
export const LARGO_MAXIMO_DE_EVENTO = 80
export const LARGO_MAXIMO_DE_PONENTE = 60

/** Nombre de una plantilla: se muestra en tarjetas del listado, similar de largo a un evento. */
export const LARGO_MAXIMO_DE_PLANTILLA = 80

/** Tope del archivo de imagen antes de codificarlo a base64 para guardarlo en sessionStorage. */
export const TAMANO_MAXIMO_DE_IMAGEN_MB = 2

/** Tope del archivo .docx que se puede importar como punto de partida de una plantilla. */
export const TAMANO_MAXIMO_DE_DOCX_MB = 10

/** Largo máximo de una etiqueta personalizada de marcador (texto libre, no un campo fijo). */
export const LARGO_MAXIMO_DE_ETIQUETA_DE_MARCADOR = 120

/** Nombre de una memoria generada: mismo criterio que el nombre de una plantilla. */
export const LARGO_MAXIMO_DE_MEMORIA = 80

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

  PLANT_NOMBRE_REQUERIDO: 'Escribe un nombre para la plantilla antes de guardarla.',
  PLANT_NOMBRE_MUY_LARGO: `El nombre de la plantilla admite hasta ${LARGO_MAXIMO_DE_PLANTILLA} caracteres. Acórtalo para guardarlo.`,
  PLANT_NO_ENCONTRADA: 'No encontramos esa plantilla. Puede que ya se haya eliminado.',
  PLANT_IMAGEN_NO_SOPORTADA:
    'Esa imagen no tiene un formato admitido. Usa PNG, JPG o WEBP e inténtalo de nuevo.',
  PLANT_IMAGEN_MUY_GRANDE: `Esa imagen supera el tamaño máximo admitido (${TAMANO_MAXIMO_DE_IMAGEN_MB} MB). Usa una más liviana.`,
  PLANT_DOCX_NO_SOPORTADO: 'Ese archivo no es un .docx admitido. Expórtalo desde Word y vuelve a intentarlo.',
  PLANT_DOCX_MUY_GRANDE: `Ese archivo supera el tamaño máximo admitido (${TAMANO_MAXIMO_DE_DOCX_MB} MB). Usa uno más liviano.`,
  PLANT_DOCX_FALLO_IMPORTACION:
    'No pudimos leer ese archivo. Puede estar dañado o usar un formato que todavía no soportamos.',
  PLANT_DOCX_FALLO_GENERACION:
    'No pudimos generar la vista previa. Revisa que las marcas [[SI:...]]/[[FIN SI]] y [[REPETIR:...]]/[[FIN REPETIR]] estén completas y bien escritas en el documento.',
  PLANT_ETIQUETA_REQUERIDA: 'Escribe una descripción para el campo personalizado antes de agregarlo.',

  MEM_CONFERENCIA_REQUERIDA: 'Elige la conferencia de la que quieres generar la memoria.',
  MEM_PLANTILLA_REQUERIDA: 'Elige la plantilla que quieres usar para la memoria.',
  MEM_NOMBRE_REQUERIDO: 'Escribe un nombre para la memoria antes de generarla.',
  MEM_NOMBRE_MUY_LARGO: `El nombre de la memoria admite hasta ${LARGO_MAXIMO_DE_MEMORIA} caracteres. Acórtalo para generarla.`,
  MEM_NO_ENCONTRADA: 'No encontramos esa memoria. Puede que ya se haya eliminado.',
  MEM_FALLO_GENERACION:
    'No pudimos generar la memoria. Puede que la conferencia o la plantilla de origen ya no estén disponibles.',
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
