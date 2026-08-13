import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import { MEMORIAS_DE_EJEMPLO } from './data'
import type { Memoria } from './data'

/*
  Persistencia de las memorias generadas: compartida entre todo el grupo
  (mismo criterio que `plantillas/almacenamiento.ts`). A diferencia de una
  plantilla, una memoria no se edita después de generarse — solo se agrega o
  se elimina, nunca se reemplaza por id.

  Misma distinción que el resto del proyecto entre "nunca se guardó nada"
  (`null`, cae a la semilla) y "se guardó vacío a propósito" (`[]`, se queda
  vacío), para que borrar la última memoria no resucite la semilla.
*/

export const CLAVE_MEMORIAS = 'bitacora-ai.memorias'

function esMemoria(valor: unknown): valor is Memoria {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['id'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    typeof candidato['idConferencia'] === 'string' &&
    typeof candidato['idPlantilla'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['generadaEl'] === 'string'
  )
}

function leerGuardadas(): readonly Memoria[] | null {
  const valor = leerJson(CLAVE_MEMORIAS)

  return Array.isArray(valor) ? valor.filter(esMemoria) : null
}

export function todasLasMemorias(): readonly Memoria[] {
  return leerGuardadas() ?? MEMORIAS_DE_EJEMPLO
}

export function guardarMemoria(memoria: Memoria): void {
  const actuales = todasLasMemorias()

  if (actuales.some((candidata) => candidata.id === memoria.id)) {
    return
  }

  escribirJson(CLAVE_MEMORIAS, [...actuales, memoria])
}

export function eliminarMemoria(id: string): void {
  escribirJson(
    CLAVE_MEMORIAS,
    todasLasMemorias().filter((memoria) => memoria.id !== id),
  )
}
