import { LARGO_MAXIMO_DE_ETIQUETA } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { EspacioDeEtiquetas, Etiqueta } from '../data'
import { normalizarTexto } from '../query'

/*
  Operaciones sobre el espacio de etiquetas de una persona.

  Todas son puras y devuelven un espacio nuevo, nunca lanzan y nunca mutan lo
  que reciben: el fallo viaja como código de error, igual que en la sesión de
  F1. Así la persistencia y el hook quedan como envoltorios finos alrededor de
  reglas que se prueban sin montar nada.
*/

export type EtiquetaVisible = {
  readonly etiqueta: Etiqueta
  /** false cuando la puso quien compartió la conferencia: se muestra, no se quita. */
  readonly propia: boolean
}

export type ResultadoEspacio =
  | { readonly ok: true; readonly espacio: EspacioDeEtiquetas }
  | { readonly ok: false; readonly codigo: CodigoError }

export type ResultadoEtiqueta =
  | { readonly ok: true; readonly espacio: EspacioDeEtiquetas; readonly etiqueta: Etiqueta }
  | { readonly ok: false; readonly codigo: CodigoError }

function esPropia(espacio: EspacioDeEtiquetas, idEtiqueta: string): boolean {
  return espacio.etiquetas.some((etiqueta) => etiqueta.id === idEtiqueta)
}

/*
  Identificador derivado del propietario y del nombre. Como dos etiquetas de la
  misma persona no pueden llamarse igual, el resultado es único dentro del
  espacio, y el prefijo del propietario lo hace único entre personas.
*/
function idParaEtiqueta(idPropietario: string, nombre: string): string {
  const base = normalizarTexto(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `etq-${idPropietario}-${base.length > 0 ? base : 'sin-nombre'}`
}

export function crearEtiqueta(
  espacio: EspacioDeEtiquetas,
  idPropietario: string,
  nombre: string,
): ResultadoEtiqueta {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return { ok: false, codigo: 'ETQ_NOMBRE_REQUERIDO' }
  }

  if (limpio.length > LARGO_MAXIMO_DE_ETIQUETA) {
    return { ok: false, codigo: 'ETQ_NOMBRE_MUY_LARGO' }
  }

  const comparable = normalizarTexto(limpio)
  const yaExiste = espacio.etiquetas.some(
    (etiqueta) => normalizarTexto(etiqueta.nombre) === comparable,
  )

  if (yaExiste) {
    return { ok: false, codigo: 'ETQ_YA_EXISTE' }
  }

  const etiqueta: Etiqueta = {
    id: idParaEtiqueta(idPropietario, limpio),
    nombre: limpio,
    idPropietario,
  }

  return {
    ok: true,
    etiqueta,
    espacio: { etiquetas: [...espacio.etiquetas, etiqueta], asignaciones: espacio.asignaciones },
  }
}

export function asignarEtiqueta(
  espacio: EspacioDeEtiquetas,
  idEtiqueta: string,
  idConferencia: string,
): ResultadoEspacio {
  if (!esPropia(espacio, idEtiqueta)) {
    return { ok: false, codigo: 'ETQ_NO_EDITABLE' }
  }

  const yaAsignada = espacio.asignaciones.some(
    (asignacion) =>
      asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia,
  )

  if (yaAsignada) {
    return { ok: true, espacio }
  }

  return {
    ok: true,
    espacio: {
      etiquetas: espacio.etiquetas,
      asignaciones: [...espacio.asignaciones, { idEtiqueta, idConferencia }],
    },
  }
}

/*
  La interfaz no dibuja el control de quitar sobre una etiqueta ajena, pero la
  regla se aplica igual aquí: PLAN.md sección 6.3 exige que el aislamiento no
  dependa de que la interfaz oculte cosas.
*/
export function quitarEtiqueta(
  espacio: EspacioDeEtiquetas,
  idEtiqueta: string,
  idConferencia: string,
): ResultadoEspacio {
  if (!esPropia(espacio, idEtiqueta)) {
    return { ok: false, codigo: 'ETQ_NO_EDITABLE' }
  }

  return {
    ok: true,
    espacio: {
      etiquetas: espacio.etiquetas,
      asignaciones: espacio.asignaciones.filter(
        (asignacion) =>
          asignacion.idEtiqueta !== idEtiqueta || asignacion.idConferencia !== idConferencia,
      ),
    },
  }
}

export function etiquetasDeConferencia(
  espacio: EspacioDeEtiquetas,
  idConferencia: string,
): readonly Etiqueta[] {
  const ids = new Set(
    espacio.asignaciones
      .filter((asignacion) => asignacion.idConferencia === idConferencia)
      .map((asignacion) => asignacion.idEtiqueta),
  )

  return espacio.etiquetas.filter((etiqueta) => ids.has(etiqueta.id))
}

export type EntradaDeEtiquetasVisibles = {
  readonly espacioPropio: EspacioDeEtiquetas
  /** Espacio del dueño de la conferencia. Es null cuando la conferencia es propia. */
  readonly espacioDelDueno: EspacioDeEtiquetas | null
  readonly idConferencia: string
  readonly compartirEtiquetas: boolean
}

/*
  Lo que se ve sobre una conferencia: siempre las propias, y las del dueño solo
  si la compartición las incluye.

  Dos etiquetas con el mismo nombre de personas distintas se muestran las dos y
  no se funden: fundirlas por nombre borraría de quién es cada una, que es
  justo lo que distingue una etiqueta personal de un tema del sistema.
*/
export function etiquetasVisibles(entrada: EntradaDeEtiquetasVisibles): readonly EtiquetaVisible[] {
  const { espacioPropio, espacioDelDueno, idConferencia, compartirEtiquetas } = entrada

  const propias: EtiquetaVisible[] = etiquetasDeConferencia(espacioPropio, idConferencia).map(
    (etiqueta) => ({ etiqueta, propia: true }),
  )

  if (espacioDelDueno === null || !compartirEtiquetas) {
    return propias
  }

  const yaPresentes = new Set(propias.map((visible) => visible.etiqueta.id))

  const ajenas: EtiquetaVisible[] = etiquetasDeConferencia(espacioDelDueno, idConferencia)
    .filter((etiqueta) => !yaPresentes.has(etiqueta.id))
    .map((etiqueta) => ({ etiqueta, propia: false }))

  return [...propias, ...ajenas]
}
