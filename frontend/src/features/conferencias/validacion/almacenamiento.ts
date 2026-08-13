import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import type { EstadoDeValidacion, Ficha } from '../data'

/*
  Estados de validación aplicados después de clasificar (F8): primera
  capacidad de la app que cambia `estadoDeValidacion`. Global y no por
  usuario — a diferencia de las etiquetas o el chat, el estado de validación
  es un hecho del dato ("esta cita ya se revisó"), no una preferencia de
  quien lo ve, así que tiene que ser el mismo para todo el mundo que vea esa
  ficha. Mismo criterio que `directorio/almacenamiento.ts`.
*/

export const CLAVE_VALIDACIONES = 'bitacora-ai.validaciones'

const ESTADOS_VALIDOS: readonly EstadoDeValidacion[] = ['validada', 'pendiente', 'automatica']

function esEstadoDeValidacion(valor: unknown): valor is EstadoDeValidacion {
  return typeof valor === 'string' && (ESTADOS_VALIDOS as readonly string[]).includes(valor)
}

export function leerValidaciones(): Readonly<Record<string, EstadoDeValidacion>> {
  const valor = leerJson(CLAVE_VALIDACIONES)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const mapa: Record<string, EstadoDeValidacion> = {}

  for (const [idFicha, crudo] of Object.entries(valor as Record<string, unknown>)) {
    if (esEstadoDeValidacion(crudo)) {
      mapa[idFicha] = crudo
    }
  }

  return mapa
}

export function marcarComoValidada(idFicha: string): void {
  escribirJson(CLAVE_VALIDACIONES, { ...leerValidaciones(), [idFicha]: 'validada' })
}

/*
  Aplica los overrides guardados sobre un arreglo de fichas del fixture, sin
  mutarlas. Se llama junto a `fichasVisibles`/`fichasDelCatalogo` en los
  mismos sitios que ya las usan — mismo patrón que `conferenciasCargadasDe`
  de F3 mezclándose antes de `conferenciasVisibles`.
*/
export function fichasConValidacionesAplicadas(
  fichas: readonly Ficha[],
  overrides: Readonly<Record<string, EstadoDeValidacion>>,
): readonly Ficha[] {
  if (Object.keys(overrides).length === 0) {
    return fichas
  }

  return fichas.map((ficha) => {
    const estado = overrides[ficha.id]

    return estado === undefined ? ficha : { ...ficha, estadoDeValidacion: estado }
  })
}
