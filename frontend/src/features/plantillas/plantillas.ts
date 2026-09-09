import { LARGO_MAXIMO_DE_PLANTILLA, TAMANO_MAXIMO_DE_IMAGEN_MB } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { JSONContent, MarcadorDeDocx, Plantilla, PlantillaDesdeDocx, PlantillaEnBlanco } from './data'

/*
  Operaciones puras sobre una plantilla. Mismo contrato que
  `directorio/directorio.ts`: nunca lanzan, nunca mutan lo que reciben, el
  fallo viaja como código de error.

  `Plantilla` es una unión discriminada por `origen` desde la segunda ronda
  de F4: `contenido` (documento TipTap) solo aplica a `blanco`;
  `archivoOriginal`/`marcadores` solo a `docx`. Las mutaciones específicas de
  cada rama (`actualizarContenido`, `actualizarMarcadoresDeDocx`) devuelven
  la plantilla sin cambios si se llaman sobre el origen equivocado, en vez de
  lanzar — mismo criterio del resto del dominio.
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

const DOCUMENTO_EN_BLANCO: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

/*
  Colores con los que nace una plantilla en blanco. Salieron de dentro de
  `crearPlantillaEnBlanco` cuando `repositorio.ts` necesitó los mismos valores
  para reconstruir una fila cuyas columnas de color llegaran nulas: las dos
  columnas son opcionales en el esquema (una plantilla `docx` no las usa), así
  que el mapeo tiene que decidir con qué se rellenan.
*/
export const COLOR_PRINCIPAL_POR_DEFECTO = '#2f5fdb'
export const COLOR_SECUNDARIO_POR_DEFECTO = '#5b6472'

/** Nombre con el que nace una plantilla en blanco — usado también para detectar un abandono sin tocar nada. */
export const NOMBRE_DE_PLANTILLA_SIN_TOCAR = 'Plantilla sin nombre'

export function crearPlantillaEnBlanco(): PlantillaEnBlanco {
  return {
    id: idNuevo(),
    nombre: NOMBRE_DE_PLANTILLA_SIN_TOCAR,
    origen: 'blanco',
    colorPrincipal: COLOR_PRINCIPAL_POR_DEFECTO,
    colorSecundario: COLOR_SECUNDARIO_POR_DEFECTO,
    contenido: DOCUMENTO_EN_BLANCO,
    actualizadaEl: new Date().toISOString(),
  }
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

export function cambiarColores(
  plantilla: Plantilla,
  colorPrincipal: string,
  colorSecundario: string,
): Plantilla {
  if (plantilla.origen !== 'blanco') {
    return plantilla
  }

  return { ...plantilla, colorPrincipal, colorSecundario, actualizadaEl: new Date().toISOString() }
}

export function actualizarContenido(plantilla: Plantilla, contenido: JSONContent): Plantilla {
  if (plantilla.origen !== 'blanco') {
    return plantilla
  }

  return { ...plantilla, contenido, actualizadaEl: new Date().toISOString() }
}

export function actualizarMarcadoresDeDocx(
  plantilla: Plantilla,
  marcadores: readonly MarcadorDeDocx[],
): Plantilla {
  if (plantilla.origen !== 'docx') {
    return plantilla
  }

  return { ...plantilla, marcadores, actualizadaEl: new Date().toISOString() }
}

/*
  Un documento TipTap "sin contenido real": ni texto (más allá de espacios en
  blanco) ni un marcador, imagen o sección — la misma forma con la que nace
  `crearPlantillaEnBlanco`. Recorre el árbol en JSON puro, sin necesitar una
  instancia de editor montada (a diferencia de `editor.isEmpty` de TipTap,
  que solo existe con un editor real).
*/
function documentoSinContenido(nodo: JSONContent): boolean {
  if (nodo.type === 'text') {
    return (nodo.text ?? '').trim().length === 0
  }

  if (nodo.type === 'marcador' || nodo.type === 'image' || nodo.type === 'seccionMarcador') {
    return false
  }

  return (nodo.content ?? []).every(documentoSinContenido)
}

/** "Crear plantilla" no pide nombre antes y persiste de inmediato — esto detecta si se abandonó sin tocar nada. */
export function esPlantillaEnBlancoAbandonada(plantilla: Plantilla): boolean {
  return (
    plantilla.origen === 'blanco' &&
    plantilla.nombre.trim() === NOMBRE_DE_PLANTILLA_SIN_TOCAR &&
    documentoSinContenido(plantilla.contenido)
  )
}

const TIPOS_DE_IMAGEN_ACEPTADOS = ['image/png', 'image/jpeg', 'image/webp']

export function validarImagen(archivo: File): { ok: true } | { ok: false; codigo: CodigoError } {
  if (!TIPOS_DE_IMAGEN_ACEPTADOS.includes(archivo.type)) {
    return { ok: false, codigo: 'PLANT_IMAGEN_NO_SOPORTADA' }
  }

  if (archivo.size > TAMANO_MAXIMO_DE_IMAGEN_MB * 1024 * 1024) {
    return { ok: false, codigo: 'PLANT_IMAGEN_MUY_GRANDE' }
  }

  return { ok: true }
}
