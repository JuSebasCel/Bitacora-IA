import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import type { Comparticion, Conferencia } from '@/features/conferencias/data'

/*
  Comparticiones creadas desde F8 (enviar invitación), en capa aparte del
  fixture — las de `conferencias.fixture.ts` están hardcodeadas y no se
  tocan. Mismo patrón que `carga/almacenamiento.ts` mezclándose antes de
  `conferenciasVisibles`: la conferencia nunca se muta, se arma un arreglo
  nuevo con la comparticion agregada puesta encima.

  Global y no por usuario — visible entre todo el grupo, mismo criterio que
  `directorio/almacenamiento.ts`: una compartición tiene que aparecer para
  el invitado, no solo para quien la creó.
*/

export const CLAVE_COMPARTICIONES_AGREGADAS = 'bitacora-ai.comparticiones-agregadas'

function esComparticion(valor: unknown): valor is Comparticion {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>
  const privacidad = candidato['privacidad']

  if (typeof privacidad !== 'object' || privacidad === null) {
    return false
  }

  const p = privacidad as Record<string, unknown>

  return (
    typeof candidato['idInvitado'] === 'string' &&
    typeof candidato['compartidaEl'] === 'string' &&
    typeof p['compartirEtiquetas'] === 'boolean' &&
    typeof p['compartirFichasPendientes'] === 'boolean' &&
    typeof p['permitirValidarFichas'] === 'boolean' &&
    typeof p['permitirRecompartir'] === 'boolean'
  )
}

export function leerComparticionesAgregadas(): Readonly<Record<string, readonly Comparticion[]>> {
  const valor = leerJson(CLAVE_COMPARTICIONES_AGREGADAS)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const mapa: Record<string, readonly Comparticion[]> = {}

  for (const [idConferencia, crudo] of Object.entries(valor as Record<string, unknown>)) {
    if (Array.isArray(crudo)) {
      const validas = crudo.filter(esComparticion)
      if (validas.length > 0) {
        mapa[idConferencia] = validas
      }
    }
  }

  return mapa
}

export function agregarComparticion(idConferencia: string, comparticion: Comparticion): void {
  const actuales = leerComparticionesAgregadas()
  const previas = actuales[idConferencia] ?? []

  escribirJson(CLAVE_COMPARTICIONES_AGREGADAS, { ...actuales, [idConferencia]: [...previas, comparticion] })
}

/*
  Mezcla las comparticiones agregadas sobre el arreglo de conferencias, antes
  de pasarlo a `conferenciasVisibles`. Se llama en cada sitio que ya arma ese
  arreglo (dashboard, detalle, catálogo, memorias) — es el punto de
  integración que hace que una invitación enviada desde F8 de verdad cambie
  quién puede ver la conferencia.
*/
export function conComparticionesAgregadas(
  conferencias: readonly Conferencia[],
  agregadas: Readonly<Record<string, readonly Comparticion[]>>,
): readonly Conferencia[] {
  if (Object.keys(agregadas).length === 0) {
    return conferencias
  }

  return conferencias.map((conferencia) => {
    const extra = agregadas[conferencia.id]

    return extra === undefined ? conferencia : { ...conferencia, comparticiones: [...conferencia.comparticiones, ...extra] }
  })
}
