import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import { TAXONOMIA_DE_EJEMPLO } from './data/taxonomia.fixture'
import type { Taxonomia, Tema, TemaActivoEnEvento, TemaPropuesto } from './data/tipos'

/*
  Persistencia de la taxonomía: compartida entre todo el grupo, no por
  usuario. Es vocabulario del sistema, no una preferencia personal, y de eso
  depende que dos personas comparen lo mismo cuando filtran por tema.

  Mismo patrón que `plantillas/almacenamiento.ts`: se relee y reescribe
  completa en cada guardado, porque aquí sí hace falta actualizar y eliminar,
  no solo anexar como en `directorio/almacenamiento.ts`.

  La distinción entre "nunca se guardó nada" (cae a la semilla) y "se guardó
  vacío a propósito" (se queda vacío) es lo que evita que borrar el último
  tema resucite el fixture.

  Todo lo que no pasa los guards se descarta en silencio, igual que en el
  resto de los almacenamientos del proyecto.
*/

export const CLAVE_TAXONOMIA = 'bitacora-ai.taxonomia'

function esCadenaUtil(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

function esTema(valor: unknown): valor is Tema {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return esCadenaUtil(candidato['id']) && esCadenaUtil(candidato['nombre'])
}

function esActivo(valor: unknown): valor is TemaActivoEnEvento {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return esCadenaUtil(candidato['idEvento']) && esCadenaUtil(candidato['idTema'])
}

function esPropuesta(valor: unknown): valor is TemaPropuesto {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    esCadenaUtil(candidato['id']) &&
    esCadenaUtil(candidato['nombre']) &&
    esCadenaUtil(candidato['idEvento']) &&
    esCadenaUtil(candidato['propuestoEl']) &&
    typeof candidato['justificacion'] === 'string'
  )
}

export function leerTaxonomia(): Taxonomia {
  const valor = leerJson(CLAVE_TAXONOMIA)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return TAXONOMIA_DE_EJEMPLO
  }

  const candidato = valor as Record<string, unknown>

  if (!Array.isArray(candidato['temas'])) {
    return TAXONOMIA_DE_EJEMPLO
  }

  return {
    temas: candidato['temas'].filter(esTema),
    activos: Array.isArray(candidato['activos']) ? candidato['activos'].filter(esActivo) : [],
    propuestas: Array.isArray(candidato['propuestas']) ? candidato['propuestas'].filter(esPropuesta) : [],
  }
}

export function guardarTaxonomia(taxonomia: Taxonomia): Taxonomia {
  escribirJson(CLAVE_TAXONOMIA, taxonomia)

  return taxonomia
}
