import { LARGO_MAXIMO_DE_EVENTO, LARGO_MAXIMO_DE_PONENTE } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { Evento, Ponente } from '../data'
import { normalizarTexto } from '../query'

/*
  Operaciones puras sobre el directorio compartido de eventos y ponentes.

  Mismo criterio que `tags/etiquetas.ts`: nunca lanzan, nunca mutan lo que
  reciben, el fallo viaja como código de error. La diferencia con las
  etiquetas es que aquí no hay "propietario" — el directorio es del grupo,
  no de una persona.
*/

export type ResultadoEvento =
  | { readonly ok: true; readonly evento: Evento }
  | { readonly ok: false; readonly codigo: CodigoError }

export type ResultadoPonente =
  | { readonly ok: true; readonly ponente: Ponente }
  | { readonly ok: false; readonly codigo: CodigoError }

function idParaEvento(nombre: string): string {
  const base = normalizarTexto(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `evt-${base.length > 0 ? base : 'sin-nombre'}`
}

function idParaPonente(idEvento: string, nombre: string): string {
  const base = normalizarTexto(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `pon-${idEvento}-${base.length > 0 ? base : 'sin-nombre'}`
}

export function crearEvento(existentes: readonly Evento[], nombre: string): ResultadoEvento {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return { ok: false, codigo: 'DIR_EVENTO_NOMBRE_REQUERIDO' }
  }

  if (limpio.length > LARGO_MAXIMO_DE_EVENTO) {
    return { ok: false, codigo: 'DIR_EVENTO_NOMBRE_MUY_LARGO' }
  }

  const comparable = normalizarTexto(limpio)
  const yaExiste = existentes.some((evento) => normalizarTexto(evento.nombre) === comparable)

  if (yaExiste) {
    return { ok: false, codigo: 'DIR_EVENTO_YA_EXISTE' }
  }

  return { ok: true, evento: { id: idParaEvento(limpio), nombre: limpio } }
}

/*
  La duplicidad se compara solo dentro del mismo evento: la misma persona
  real puede hablar en eventos distintos sin que sean la misma entrada (ya
  pasa en el fixture de conferencias).
*/
export function crearPonente(
  existentes: readonly Ponente[],
  idEvento: string,
  nombre: string,
): ResultadoPonente {
  const limpio = nombre.trim()

  if (limpio.length === 0) {
    return { ok: false, codigo: 'DIR_PONENTE_NOMBRE_REQUERIDO' }
  }

  if (limpio.length > LARGO_MAXIMO_DE_PONENTE) {
    return { ok: false, codigo: 'DIR_PONENTE_NOMBRE_MUY_LARGO' }
  }

  const comparable = normalizarTexto(limpio)
  const yaExiste = existentes.some(
    (ponente) => ponente.idEvento === idEvento && normalizarTexto(ponente.nombre) === comparable,
  )

  if (yaExiste) {
    return { ok: false, codigo: 'DIR_PONENTE_YA_EXISTE' }
  }

  return { ok: true, ponente: { id: idParaPonente(idEvento, limpio), nombre: limpio, idEvento } }
}

export function ponentesDe(todos: readonly Ponente[], idEvento: string): readonly Ponente[] {
  return todos.filter((ponente) => ponente.idEvento === idEvento)
}
