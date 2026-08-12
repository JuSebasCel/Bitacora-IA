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

function idAleatorio(prefijo: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `${prefijo}-${uuid}`
  }

  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const DOCUMENTO_EN_BLANCO: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

/** Nombre con el que nace una plantilla en blanco — usado también para detectar un abandono sin tocar nada. */
export const NOMBRE_DE_PLANTILLA_SIN_TOCAR = 'Plantilla sin nombre'

export function crearPlantillaEnBlanco(): PlantillaEnBlanco {
  return {
    id: idAleatorio('pla'),
    nombre: NOMBRE_DE_PLANTILLA_SIN_TOCAR,
    origen: 'blanco',
    colorPrincipal: '#2f5fdb',
    colorSecundario: '#5b6472',
    contenido: DOCUMENTO_EN_BLANCO,
    actualizadaEl: new Date().toISOString(),
  }
}

export function crearPlantillaDesdeDocx(
  archivoOriginal: string,
  nombre: string,
  marcadores: readonly MarcadorDeDocx[],
): PlantillaDesdeDocx {
  return {
    id: idAleatorio('pla'),
    nombre,
    origen: 'docx',
    archivoOriginal,
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
