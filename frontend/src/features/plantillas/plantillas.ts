import { LARGO_MAXIMO_DE_PLANTILLA } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { MarcadorDeDocx, Plantilla, PlantillaDesdeDocx } from './data'

/*
  Operaciones puras sobre una plantilla. Mismo contrato que
  `directorio/directorio.ts`: nunca lanzan, nunca mutan lo que reciben, el
  fallo viaja como código de error.

  Desde que se quitó la plantilla en blanco solo hay un origen, `docx`: el
  campo se conserva porque la columna existe y distingue las filas viejas que
  todavía pudieran quedar en la base (ver `repositorio.ts`).
*/

export type ResultadoPlantilla =
  | { readonly ok: true; readonly plantilla: Plantilla }
  | { readonly ok: false; readonly codigo: CodigoError }

/*
  El id de una plantilla lo genera el cliente, no el `gen_random_uuid()` de la
  columna. Dos razones, y la primera es dura: la ruta del `.docx` en el bucket
  se arma con el id (`{id}/original.docx`) y el archivo tiene que estar subido
  *antes* del `insert`, porque `ruta_archivo_original` es `not null`. Esperar
  el id de la base obligaría a insertar la fila, subir, y volver a
  actualizarla, con una ventana en la que el registro apunta a un archivo que
  todavía no existe. La segunda es que estas funciones son totales: devuelven
  una `Plantilla` completa y utilizable, sin una variante "todavía sin id" que
  cada consumidor tendría que contemplar solo porque la fila no ha vuelto.

  Es un UUID de verdad (no el `pla-...` de antes) porque la columna es `uuid`:
  un id con prefijo lo rechazaría Postgres. El respaldo sin `crypto.randomUUID`
  arma la misma forma a mano, para entornos donde ese API no existe.
*/
export function idNuevo(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return uuid
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caracter) => {
    const azar = Math.floor(Math.random() * 16)
    const valor = caracter === 'x' ? azar : (azar & 0x3) | 0x8
    return valor.toString(16)
  })
}

/*
  El id se pide por parámetro, y no se genera aquí: la ruta del `.docx` dentro
  del bucket ya lo contiene, así que para cuando esta función corre el archivo
  lleva subido bajo ese mismo id (ver `repositorio.ts`).
*/
export function crearPlantillaDesdeDocx(
  id: string,
  rutaArchivoOriginal: string,
  nombre: string,
  marcadores: readonly MarcadorDeDocx[],
): PlantillaDesdeDocx {
  return {
    id,
    nombre,
    origen: 'docx',
    rutaArchivoOriginal,
    marcadores,
    actualizadaEl: new Date().toISOString(),
  }
}

export function renombrarPlantilla(plantilla: Plantilla, nombre: string): ResultadoPlantilla {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return { ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' }
  }

  if (limpio.length > LARGO_MAXIMO_DE_PLANTILLA) {
    return { ok: false, codigo: 'PLANT_NOMBRE_MUY_LARGO' }
  }

  return { ok: true, plantilla: { ...plantilla, nombre: limpio, actualizadaEl: new Date().toISOString() } }
}

export function actualizarMarcadoresDeDocx(
  plantilla: Plantilla,
  marcadores: readonly MarcadorDeDocx[],
): Plantilla {
  return { ...plantilla, marcadores, actualizadaEl: new Date().toISOString() }
}

/*
  `[[Resumen de la tesis]]` → `Resumen de la tesis`: el nombre de un hueco tal
  como lo escribió quien diseñó la plantilla, sin los corchetes.

  Vive aquí y no en una pantalla porque lo usan dos sitios que no se conocen:
  la configuración de la plantilla, para enseñarlo, y la redacción de la
  memoria, que se lo manda al modelo como pista de qué va en el hueco cuando
  no hay instrucción.
*/
export function nombreDeMarcador(textoOriginal: string): string {
  return textoOriginal.replace(/^\[\[/, '').replace(/\]\]$/, '').trim()
}
