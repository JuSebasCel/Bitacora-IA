import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import { PLANTILLAS_DE_EJEMPLO } from './data'
import type { Plantilla } from './data'

/*
  Persistencia de las plantillas: compartida entre todo el grupo (igual que
  `directorio/almacenamiento.ts`), pero a diferencia de ese archivo, aquí sí
  hace falta actualizar y eliminar por id — una plantilla se edita una y otra
  vez, no solo se anexa. Por eso el arreglo completo se relee/reescribe en
  cada guardado, en vez de fusionarse con la semilla como hace el directorio.

  La distinción entre "nunca se guardó nada" (null, cae a la semilla) y "se
  guardó vacío a propósito" ([], se queda vacío) es la que permite que borrar
  la última plantilla no resucite la semilla del fixture.
*/

export const CLAVE_PLANTILLAS = 'bitacora-ai.plantillas'

/*
  No se valida la forma interna del documento TipTap más allá de "es un nodo
  `doc` con contenido": el esquema real (qué tipos de nodo/atributos son
  válidos) lo aplica el propio editor al montar, y una entrada corrupta ahí
  cae al mismo camino de "se descarta en silencio" que una plantilla inválida
  completa.
*/
function esContenido(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return candidato['type'] === 'doc' && Array.isArray(candidato['content'])
}

function esOrigenDeDato(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return candidato['tipo'] === 'campo'
    ? typeof candidato['campo'] === 'string'
    : candidato['tipo'] === 'personalizado' && typeof candidato['etiqueta'] === 'string'
}

function esMarcadorDeDocx(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  if (typeof candidato['id'] !== 'string' || !esOrigenDeDato(candidato['origenDeDato'])) {
    return false
  }

  switch (candidato['tipo']) {
    case 'simple':
      return (
        typeof candidato['textoOriginal'] === 'string' &&
        typeof candidato['contexto'] === 'string' &&
        typeof candidato['formato'] === 'string'
      )
    case 'condicional':
    case 'repetible':
      return typeof candidato['descripcion'] === 'string'
    default:
      return false
  }
}

function esPlantilla(valor: unknown): valor is Plantilla {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  const camposComunes =
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['actualizadaEl'] === 'string' &&
    candidato['id'].trim().length > 0

  if (!camposComunes) {
    return false
  }

  if (candidato['origen'] === 'blanco') {
    return (
      typeof candidato['colorPrincipal'] === 'string' &&
      typeof candidato['colorSecundario'] === 'string' &&
      esContenido(candidato['contenido'])
    )
  }

  if (candidato['origen'] === 'docx') {
    return (
      typeof candidato['archivoOriginal'] === 'string' &&
      candidato['archivoOriginal'].length > 0 &&
      Array.isArray(candidato['marcadores']) &&
      candidato['marcadores'].every(esMarcadorDeDocx)
    )
  }

  return false
}

/** `null` = nunca se guardó nada (cae a la semilla); `[]` = se guardó vacío a propósito. */
function leerGuardadas(): readonly Plantilla[] | null {
  const valor = leerJson(CLAVE_PLANTILLAS)

  return Array.isArray(valor) ? valor.filter(esPlantilla) : null
}

export function todasLasPlantillas(): readonly Plantilla[] {
  return leerGuardadas() ?? PLANTILLAS_DE_EJEMPLO
}

export function guardarPlantilla(plantilla: Plantilla): void {
  const actuales = todasLasPlantillas()
  const existe = actuales.some((candidata) => candidata.id === plantilla.id)

  escribirJson(
    CLAVE_PLANTILLAS,
    existe
      ? actuales.map((candidata) => (candidata.id === plantilla.id ? plantilla : candidata))
      : [...actuales, plantilla],
  )
}

export function eliminarPlantilla(id: string): void {
  escribirJson(
    CLAVE_PLANTILLAS,
    todasLasPlantillas().filter((plantilla) => plantilla.id !== id),
  )
}
