import { supabase } from '@/shared/supabase/cliente'
import { codigoDeErrorDeSupabase, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { MarcadorDeDocx, Plantilla } from './data'

/*
  Único punto del dominio de plantillas que habla con Supabase (B6). Las
  pantallas, los componentes y `usePlantillas` dependen de estas funciones y
  nunca de `supabase.from(...)` ni de `supabase.storage`: así la interfaz no
  aprende la forma de una fila ni la de un `PostgrestError`, y las pruebas de
  componente sustituyen este módulo entero.

  Dos almacenamientos, no uno. La fila de `plantillas` guarda los metadatos y,
  para una plantilla importada, solo la **ruta** del `.docx` dentro del bucket
  `plantillas-docx`. Los bytes viven en Storage. Antes de B6 el archivo entero
  viajaba como data URL dentro del registro en `sessionStorage`, que es
  insostenible: un `.docx` de 10 MB son ~14 MB de base64 contra una cuota
  típica de 5 MB.

  Esa separación obliga a que las dos escrituras se coordinen a mano, porque
  Postgres y Storage no comparten transacción: al crear se sube primero y se
  inserta después (si el insert falla, se borra el archivo recién subido); al
  eliminar se borra primero la fila y después el archivo (si el borrado del
  archivo falla, queda un huérfano en el bucket, que es mucho más barato que
  una fila apuntando a un archivo inexistente).
*/

const TABLA = 'plantillas'
const BUCKET = 'plantillas-docx'

/** Forma de una fila de `plantillas` tal como la devuelve PostgREST (columnas en snake_case). */
type FilaDePlantilla = {
  readonly id: string
  readonly nombre: string
  readonly origen: string
  readonly ruta_archivo_original: string | null
  readonly marcadores: readonly MarcadorDeDocx[] | null
  readonly actualizada_el: string
}

/*
  Solo existen plantillas de Word. La plantilla en blanco —el editor dentro de
  la app— se retiró, pero la base puede conservar filas suyas de cuando
  existía: se descartan al leer en vez de fingir que son de Word, porque una
  plantilla sin `.docx` no puede generar ninguna memoria y enseñarla solo
  prometería algo que falla al usarla. Las columnas que usaba (`contenido`,
  `color_principal`, `color_secundario`) siguen en la tabla y se escriben en
  `null`, que es lo que el `check` de la tabla exige a una fila `docx`.

  Una ruta ausente se rellena con cadena vacía en vez de lanzar: una fila
  escrita a mano desde el panel de Supabase no puede tumbar el listado de todo
  el mundo; al abrirla, la descarga del archivo fallará con su propio aviso.
*/
function plantillaDesdeFila(fila: FilaDePlantilla): Plantilla | null {
  if (fila.origen !== 'docx') {
    return null
  }

  return {
    id: fila.id,
    nombre: fila.nombre,
    origen: 'docx',
    rutaArchivoOriginal: fila.ruta_archivo_original ?? '',
    marcadores: fila.marcadores ?? [],
    actualizadaEl: fila.actualizada_el,
  }
}

function filaDesdePlantilla(plantilla: Plantilla): Record<string, unknown> {
  return {
    id: plantilla.id,
    nombre: plantilla.nombre,
    origen: plantilla.origen,
    actualizada_el: plantilla.actualizadaEl,
    color_principal: null,
    color_secundario: null,
    contenido: null,
    ruta_archivo_original: plantilla.rutaArchivoOriginal,
    marcadores: plantilla.marcadores,
  }
}

/**
 * Listado completo, de la editada más recientemente a la más antigua.
 *
 * No hay columna de creación en el esquema y agregar una solo para ordenar no
 * lo justifica: la recencia de edición es además el orden útil en un taller de
 * plantillas, donde se vuelve una y otra vez sobre la que se está afinando.
 */
export async function listarPlantillas(): Promise<ResultadoDeConsulta<readonly Plantilla[]>> {
  const respuesta = await supabase.from(TABLA).select('*').order('actualizada_el', { ascending: false })

  const resultado = resultadoDeLista<FilaDePlantilla>(respuesta)

  return resultado.ok
    ? {
        ok: true,
        datos: resultado.datos.flatMap((fila) => {
          const plantilla = plantillaDesdeFila(fila)
          return plantilla === null ? [] : [plantilla]
        }),
      }
    : resultado
}

/**
 * Inserta una plantilla recién construida por `plantillas.ts`.
 *
 * No relee la fila con un `select()`: la plantilla que se acaba de insertar ya
 * es idéntica a lo que quedó guardado (el id lo puso el cliente, y ninguna
 * columna tiene un valor calculado por la base que la interfaz necesite), así
 * que pedirla de vuelta solo agregaría latencia a un flujo que navega de
 * inmediato al editor.
 */
export async function crearPlantilla(plantilla: Plantilla): Promise<ResultadoDeConsulta<Plantilla>> {
  const { error } = await supabase.from(TABLA).insert(filaDesdePlantilla(plantilla))

  return error === null
    ? { ok: true, datos: plantilla }
    : { ok: false, codigo: codigoDeErrorDeSupabase(error) }
}

/**
 * Reemplaza la fila completa de una plantilla ya existente.
 *
 * Devuelve la plantilla que se pidió guardar y no la fila releída: quien llama
 * ya pintó ese valor de forma optimista, y devolver algo distinto obligaría a
 * la interfaz a reconciliar dos versiones del mismo documento mientras la
 * persona sigue escribiendo.
 */
export async function actualizarPlantilla(plantilla: Plantilla): Promise<ResultadoDeConsulta<Plantilla>> {
  const { error } = await supabase.from(TABLA).update(filaDesdePlantilla(plantilla)).eq('id', plantilla.id)

  return error === null
    ? { ok: true, datos: plantilla }
    : { ok: false, codigo: codigoDeErrorDeSupabase(error) }
}

export async function eliminarPlantilla(id: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase.from(TABLA).delete().eq('id', id)

  return error === null ? { ok: true, datos: null } : { ok: false, codigo: codigoDeErrorDeSupabase(error) }
}

/** Ruta del `.docx` de una plantilla dentro del bucket: una carpeta por plantilla, un solo archivo dentro. */
export function rutaDeDocx(idPlantilla: string): string {
  return `${idPlantilla}/original.docx`
}

/*
  Storage no devuelve un `PostgrestError`, así que la traducción compartida de
  `consultas.ts` no aplica aquí. En vez de inventar un segundo catálogo de
  códigos de Postgres, los dos fallos posibles se nombran desde el dominio
  (`PLANT_DOCX_FALLO_SUBIDA`/`PLANT_DOCX_FALLO_DESCARGA`): a quien está
  subiendo o abriendo una plantilla le importa qué acción falló, no qué
  respondió el servicio de archivos.
*/
export async function subirDocxDePlantilla(
  idPlantilla: string,
  archivo: File,
): Promise<ResultadoDeConsulta<string>> {
  const ruta = rutaDeDocx(idPlantilla)

  const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type,
    /* Reimportar sobre la misma plantilla reemplaza el archivo en vez de fallar por existir. */
    upsert: true,
  })

  return error === null ? { ok: true, datos: ruta } : { ok: false, codigo: 'PLANT_DOCX_FALLO_SUBIDA' }
}

export async function descargarDocxDePlantilla(ruta: string): Promise<ResultadoDeConsulta<Blob>> {
  const { data, error } = await supabase.storage.from(BUCKET).download(ruta)

  if (error !== null || data === null) {
    return { ok: false, codigo: 'PLANT_DOCX_FALLO_DESCARGA' }
  }

  return { ok: true, datos: data }
}

/*
  Borrar el archivo es limpieza, no parte del resultado que la persona ve: la
  plantilla ya desapareció de su listado cuando esto corre. Por eso el fallo
  viaja con el código genérico de datos y no con uno propio de plantillas --
  no hay ninguna pantalla que deba decir "no pudimos borrar el archivo", y un
  huérfano en el bucket no rompe nada.
*/
export async function eliminarDocxDePlantilla(ruta: string): Promise<ResultadoDeConsulta<null>> {
  const { error } = await supabase.storage.from(BUCKET).remove([ruta])

  return error === null ? { ok: true, datos: null } : { ok: false, codigo: 'DATOS_FALLO_INESPERADO' }
}
