import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import { ESPACIO_DE_ETIQUETAS_VACIO, ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO } from '../data'
import type { AsignacionDeEtiqueta, EspacioDeEtiquetas, Etiqueta } from '../data'

/*
  Persistencia de las etiquetas creadas durante el uso.

  Mismo patrón que las cuentas registradas de F1: el fixture es la semilla y lo
  que la persona crea vive en sessionStorage. Se guarda un espacio por usuario,
  y no una lista global con un campo de propietario, para que sea imposible
  leer las etiquetas de otro por olvidar un filtro.

  Todo lo que no pasa los guards se descarta en silencio: la alternativa sería
  que un valor corrupto en el almacenamiento impidiera abrir el dashboard.
*/

export const CLAVE_ETIQUETAS = 'bitacora-ai.etiquetas'

function esEtiqueta(valor: unknown): valor is Etiqueta {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['idPropietario'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    candidato['nombre'].trim().length > 0
  )
}

function esAsignacion(valor: unknown): valor is AsignacionDeEtiqueta {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['idEtiqueta'] === 'string' && typeof candidato['idConferencia'] === 'string'
  )
}

function normalizarEspacio(valor: unknown): EspacioDeEtiquetas | null {
  if (typeof valor !== 'object' || valor === null) {
    return null
  }

  const candidato = valor as Record<string, unknown>
  const etiquetas = candidato['etiquetas']
  const asignaciones = candidato['asignaciones']

  if (!Array.isArray(etiquetas) || !Array.isArray(asignaciones)) {
    return null
  }

  const validas = etiquetas.filter(esEtiqueta)
  const idsValidos = new Set(validas.map((etiqueta) => etiqueta.id))

  return {
    etiquetas: validas,
    /* Una asignación que apunta a una etiqueta descartada no tiene sentido. */
    asignaciones: asignaciones
      .filter(esAsignacion)
      .filter((asignacion) => idsValidos.has(asignacion.idEtiqueta)),
  }
}

export function leerEspaciosGuardados(): Readonly<Record<string, EspacioDeEtiquetas>> {
  const valor = leerJson(CLAVE_ETIQUETAS)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const espacios: Record<string, EspacioDeEtiquetas> = {}

  for (const [idUsuario, crudo] of Object.entries(valor as Record<string, unknown>)) {
    const espacio = normalizarEspacio(crudo)

    if (espacio !== null) {
      espacios[idUsuario] = espacio
    }
  }

  return espacios
}

/*
  Lo guardado reemplaza al fixture y no se fusiona con él: las operaciones
  producen siempre un espacio completo a partir de la semilla, así que fusionar
  resucitaría etiquetas que la persona quitó.
*/
export function espacioDe(idUsuario: string): EspacioDeEtiquetas {
  return (
    leerEspaciosGuardados()[idUsuario] ??
    ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[idUsuario] ??
    ESPACIO_DE_ETIQUETAS_VACIO
  )
}

export function guardarEspacio(idUsuario: string, espacio: EspacioDeEtiquetas): void {
  escribirJson(CLAVE_ETIQUETAS, { ...leerEspaciosGuardados(), [idUsuario]: espacio })
}
