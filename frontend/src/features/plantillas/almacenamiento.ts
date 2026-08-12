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

function esRectangulo(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['x'] === 'number' &&
    typeof candidato['y'] === 'number' &&
    typeof candidato['ancho'] === 'number' &&
    typeof candidato['alto'] === 'number'
  )
}

function esElemento(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  if (typeof candidato['id'] !== 'string' || !esRectangulo(candidato['posicion'])) {
    return false
  }

  switch (candidato['tipo']) {
    case 'texto':
      return typeof candidato['rol'] === 'string' && typeof candidato['contenido'] === 'string'
    case 'imagen':
      return typeof candidato['url'] === 'string' && typeof candidato['nombreDeArchivo'] === 'string'
    case 'marcador':
      return typeof candidato['campo'] === 'string' && typeof candidato['formato'] === 'string'
    default:
      return false
  }
}

function esPlantilla(valor: unknown): valor is Plantilla {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['colorPrincipal'] === 'string' &&
    typeof candidato['colorSecundario'] === 'string' &&
    typeof candidato['actualizadaEl'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    Array.isArray(candidato['elementos']) &&
    candidato['elementos'].every(esElemento)
  )
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
