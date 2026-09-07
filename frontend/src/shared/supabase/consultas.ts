import type { PostgrestError } from '@supabase/supabase-js'
import type { CodigoError } from '@/shared/errors'

/*
  Traducción de un fallo de Supabase a un código del catálogo de errores, y el
  resultado uniforme que devuelven todos los repositorios de la serie B.

  Cada dominio expone un `repositorio.ts` con funciones asíncronas planas
  (`listarX`, `crearX`, ...) que devuelven `ResultadoDeConsulta`. Las pantallas
  y hooks nunca hablan con `supabase.from(...)` directamente: dependen del
  repositorio, que es lo que se sustituye en las pruebas de componente. Así la
  interfaz no tiene que aprender la forma de un `PostgrestError`, y el día que
  una tabla cambie de nombre solo cambia un archivo por dominio.

  Se traducen únicamente los tres desenlaces que la interfaz sabe distinguir y
  sobre los que la persona puede actuar -- conflicto de unicidad, permiso
  denegado por RLS y falta de red. Todo lo demás cae a `DATOS_FALLO_INESPERADO`
  a propósito: un `SQLSTATE` crudo en pantalla no le sirve a nadie y filtra la
  forma interna de la base de datos (CLAUDE.md sección 5).
*/

export type ResultadoDeConsulta<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly codigo: CodigoError }

/** Violación de restricción única: `23505` en Postgres. */
const CODIGO_PG_UNICIDAD = '23505'

/** Violación de llave foránea: la fila referenciada ya no existe. */
const CODIGO_PG_LLAVE_FORANEA = '23503'

/*
  RLS rechaza una escritura con `42501` (privilegio insuficiente), y PostgREST
  responde `PGRST301`/`PGRST116` cuando la fila existe pero la política no deja
  verla -- desde el cliente los tres significan lo mismo: no te corresponde.
*/
const CODIGOS_PG_SIN_PERMISO = new Set(['42501', 'PGRST301'])

export function codigoDeErrorDeSupabase(error: PostgrestError): CodigoError {
  if (error.code === CODIGO_PG_UNICIDAD) {
    return 'DATOS_CONFLICTO'
  }

  if (error.code === CODIGO_PG_LLAVE_FORANEA || CODIGOS_PG_SIN_PERMISO.has(error.code ?? '')) {
    return 'DATOS_SIN_PERMISO'
  }

  /*
    `supabase-js` no distingue un fallo de red con un código propio: llega como
    un `TypeError: Failed to fetch` envuelto, con `code` vacío. Es el único
    caso que se reconoce por mensaje, y solo después de haber descartado todos
    los códigos reales.
  */
  if ((error.code ?? '') === '' && /fetch|network|conexi/i.test(error.message ?? '')) {
    return 'DATOS_SIN_CONEXION'
  }

  return 'DATOS_FALLO_INESPERADO'
}

/*
  Envuelve la respuesta de una consulta de Supabase. `datos` puede llegar nulo
  aunque no haya error (un `maybeSingle()` sin coincidencias), así que quien
  llama decide qué significa eso en su dominio pasando `siVacio`.
*/
export function resultadoDe<T>(
  respuesta: { data: T | null; error: PostgrestError | null },
  siVacio: () => ResultadoDeConsulta<T>,
): ResultadoDeConsulta<T> {
  if (respuesta.error !== null) {
    return { ok: false, codigo: codigoDeErrorDeSupabase(respuesta.error) }
  }

  if (respuesta.data === null) {
    return siVacio()
  }

  return { ok: true, datos: respuesta.data }
}

/** Caso habitual de un listado: sin error y sin filas es una lista vacía, nunca un fallo. */
export function resultadoDeLista<T>(respuesta: {
  data: T[] | null
  error: PostgrestError | null
}): ResultadoDeConsulta<readonly T[]> {
  if (respuesta.error !== null) {
    return { ok: false, codigo: codigoDeErrorDeSupabase(respuesta.error) }
  }

  return { ok: true, datos: respuesta.data ?? [] }
}
