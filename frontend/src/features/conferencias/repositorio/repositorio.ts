import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { Conferencia, EstadoDeValidacion, Ficha } from '../data'
import { filaParaInsertar, mapearConferencia, mapearFicha, mapearFilas } from './mapeo'
import type { ConferenciaParaInsertar, FilaDeConferencia, FilaDeFicha } from './mapeo'

/*
  Único punto del dominio de conferencias que habla con Supabase. Pantallas y
  hooks dependen de estas funciones y nunca de `supabase.from(...)`: así una
  prueba de componente sustituye este módulo entero en vez de aprenderse la
  forma de una cadena de PostgREST, y el día que cambie el nombre de una tabla
  cambia un solo archivo.

  Sobre el aislamiento: quién ve qué ya no lo decide el frontend. Las
  políticas de RLS de `20260814032437_esquema_propio.sql` filtran las filas
  antes de que salgan de Postgres, así que un listado nunca trae una
  conferencia ajena aunque el cliente pida `select('*')` sin condiciones. Las
  reglas puras de `query/acceso.ts` siguen vivas, pero cambiaron de papel:
  antes eran la única puerta, ahora derivan la procedencia (propia o
  compartida) y la privacidad efectiva sobre filas que Postgres ya autorizó.
  Se conservan además como segunda barrera — que la interfaz y la base de
  datos coincidan es justo lo que hace que un fallo en una de las dos se note.
*/

/*
  Las comparticiones viajan embebidas en la misma consulta y no en una segunda
  llamada: la interfaz necesita la privacidad para decidir qué fichas mostrar,
  así que pedirlas aparte abriría una ventana en la que el listado ya está
  dibujado sin saber todavía qué puede enseñar.
*/
const COLUMNAS_DE_CONFERENCIA =
  '*, comparticiones ( id_invitado, compartida_el, privacidad )'

const BUCKET_DE_AUDIO = 'audio-conferencias'

/** Lo que la sesión puede ver: lo propio y lo compartido, resuelto por RLS. */
export async function listarConferencias(): Promise<ResultadoDeConsulta<readonly Conferencia[]>> {
  const respuesta = await supabase
    .from('conferencias')
    .select(COLUMNAS_DE_CONFERENCIA)
    .order('fecha_del_evento', { ascending: false })

  const lista = resultadoDeLista(respuesta as { data: FilaDeConferencia[] | null; error: null })

  return lista.ok ? { ok: true, datos: mapearFilas(lista.datos, mapearConferencia) } : lista
}

/*
  Devuelve `CONF_NO_ENCONTRADA` tanto para una conferencia inexistente como
  para una que existe pero RLS no deja ver. La indistinguibilidad es la misma
  que ya describía `query/acceso.ts` y sigue importando: si los dos casos se
  diferenciaran, bastaría probar identificadores contra el detalle para
  averiguar qué ha subido otra persona.
*/
export async function obtenerConferencia(
  idConferencia: string,
): Promise<ResultadoDeConsulta<Conferencia>> {
  const respuesta = await supabase
    .from('conferencias')
    .select(COLUMNAS_DE_CONFERENCIA)
    .eq('id', idConferencia)
    .maybeSingle()

  const fila = resultadoDe(respuesta as { data: FilaDeConferencia | null; error: null }, () => ({
    ok: false,
    codigo: 'CONF_NO_ENCONTRADA',
  }))

  if (!fila.ok) {
    return fila
  }

  const conferencia = mapearConferencia(fila.datos)

  return conferencia === null ? { ok: false, codigo: 'CONF_NO_ENCONTRADA' } : { ok: true, datos: conferencia }
}

/** Las fichas de una conferencia. RLS ya excluye las pendientes si la compartición no las incluye. */
export async function listarFichasDe(
  idConferencia: string,
): Promise<ResultadoDeConsulta<readonly Ficha[]>> {
  const respuesta = await supabase
    .from('fichas')
    .select('*')
    .eq('id_conferencia', idConferencia)
    .order('segundo_inicio', { ascending: true })

  const lista = resultadoDeLista(respuesta as { data: FilaDeFicha[] | null; error: null })

  return lista.ok ? { ok: true, datos: mapearFilas(lista.datos, mapearFicha) } : lista
}

/*
  Todas las fichas visibles, para el catálogo y el chat. Es una sola consulta y
  no una por conferencia: el catálogo cruza fichas de varias charlas a la vez,
  y pedirlas en bucle multiplicaría los viajes por el tamaño del listado.
*/
export async function listarFichasVisibles(): Promise<ResultadoDeConsulta<readonly Ficha[]>> {
  const respuesta = await supabase.from('fichas').select('*')

  const lista = resultadoDeLista(respuesta as { data: FilaDeFicha[] | null; error: null })

  return lista.ok ? { ok: true, datos: mapearFilas(lista.datos, mapearFicha) } : lista
}

/*
  Cambiar el estado de validación de una ficha. No se restringe aquí quién
  puede hacerlo: la política «un invitado con permiso valida fichas de una
  conferencia compartida» ya lo decide en Postgres, y una comprobación extra
  en el cliente daría la falsa impresión de ser la que protege.
*/
export async function actualizarEstadoDeValidacion(
  idFicha: string,
  estado: EstadoDeValidacion,
): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase
    .from('fichas')
    .update({ estado_de_validacion: estado })
    .eq('id', idFicha)

  return error === null
    ? { ok: true, datos: null }
    : resultadoDe({ data: null, error }, () => ({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' }))
}

/** Ruta del audio dentro del bucket. El primer segmento es el dueño porque la política de Storage lo exige. */
export function rutaDeAudio(idDueno: string, idConferencia: string, nombreDeArchivo: string): string {
  return `${idDueno}/${idConferencia}/${nombreDeArchivo}`
}

/*
  Crear una conferencia son dos escrituras que no comparten transacción: la
  fila primero (para tener el id que da nombre a la carpeta del audio) y el
  archivo después.

  Si la subida falla se borra la fila recién creada. Sin esa compensación
  quedaría una conferencia `en-cola` cuyo audio no existe: el análisis nunca
  la podría procesar y se quedaría para siempre en ese estado, sin que nadie
  pudiera explicar por qué. Es preferible que la carga falle entera y la
  persona la repita.
*/
export async function crearConferencia(
  datos: ConferenciaParaInsertar,
  archivo: File | null,
): Promise<ResultadoDeConsulta<Conferencia>> {
  const respuesta = await supabase
    .from('conferencias')
    .insert(filaParaInsertar(datos))
    .select(COLUMNAS_DE_CONFERENCIA)
    .single()

  const fila = resultadoDe(respuesta as { data: FilaDeConferencia | null; error: null }, () => ({
    ok: false,
    codigo: 'CARGA_FALLO_INESPERADO',
  }))

  if (!fila.ok) {
    return fila
  }

  const conferencia = mapearConferencia(fila.datos)

  if (conferencia === null) {
    return { ok: false, codigo: 'CARGA_FALLO_INESPERADO' }
  }

  if (archivo === null) {
    return { ok: true, datos: conferencia }
  }

  const { error } = await supabase.storage
    .from(BUCKET_DE_AUDIO)
    .upload(rutaDeAudio(datos.idDueno, conferencia.id, archivo.name), archivo)

  if (error !== null) {
    await supabase.from('conferencias').delete().eq('id', conferencia.id)
    return { ok: false, codigo: 'CARGA_FALLO_INESPERADO' }
  }

  return { ok: true, datos: conferencia }
}
