import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import type { Conferencia } from '../data'

/*
  Conferencias cargadas durante la sesión, guardadas por usuario (mismo
  patrón que las etiquetas personales): son datos de esa persona, no del
  grupo, a diferencia del directorio de eventos y ponentes.
*/

export const CLAVE_CARGADAS = 'bitacora-ai.conferencias-cargadas'

function esConferencia(valor: unknown): valor is Conferencia {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidata = valor as Record<string, unknown>

  return (
    typeof candidata['id'] === 'string' &&
    typeof candidata['idDueno'] === 'string' &&
    typeof candidata['titulo'] === 'string'
  )
}

function leerMapaGuardado(): Readonly<Record<string, readonly Conferencia[]>> {
  const valor = leerJson(CLAVE_CARGADAS)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const mapa: Record<string, readonly Conferencia[]> = {}

  for (const [idUsuario, crudo] of Object.entries(valor as Record<string, unknown>)) {
    if (Array.isArray(crudo)) {
      mapa[idUsuario] = crudo.filter(esConferencia)
    }
  }

  return mapa
}

export function conferenciasCargadasDe(idUsuario: string): readonly Conferencia[] {
  return leerMapaGuardado()[idUsuario] ?? []
}

export function agregarConferenciaCargada(idUsuario: string, conferencia: Conferencia): void {
  const actuales = conferenciasCargadasDe(idUsuario)

  escribirJson(CLAVE_CARGADAS, { ...leerMapaGuardado(), [idUsuario]: [...actuales, conferencia] })
}
