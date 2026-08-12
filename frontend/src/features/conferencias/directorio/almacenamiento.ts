import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import type { Evento, Ponente } from '../data'
import { EVENTOS_DE_EJEMPLO } from './eventos.fixture'
import { PONENTES_DE_EJEMPLO } from './ponentes.fixture'

/*
  Persistencia del directorio compartido de eventos y ponentes.

  A diferencia de `tags/almacenamiento.ts`, aquí no hay espacio por usuario:
  es una sola lista para todo el grupo. Por eso se fusiona con la semilla del
  fixture en vez de reemplazarla como hacen las etiquetas — nadie borra un
  evento, así que no hace falta que lo guardado se imponga sobre la semilla.
*/

export const CLAVE_EVENTOS = 'bitacora-ai.eventos'
export const CLAVE_PONENTES = 'bitacora-ai.ponentes'

function esEvento(valor: unknown): valor is Evento {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    candidato['nombre'].trim().length > 0
  )
}

function esPonente(valor: unknown): valor is Ponente {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['idEvento'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    candidato['nombre'].trim().length > 0 &&
    candidato['idEvento'].trim().length > 0
  )
}

function leerEventosGuardados(): readonly Evento[] {
  const valor = leerJson(CLAVE_EVENTOS)

  return Array.isArray(valor) ? valor.filter(esEvento) : []
}

function leerPonentesGuardados(): readonly Ponente[] {
  const valor = leerJson(CLAVE_PONENTES)

  return Array.isArray(valor) ? valor.filter(esPonente) : []
}

export function todosLosEventos(): readonly Evento[] {
  return [...EVENTOS_DE_EJEMPLO, ...leerEventosGuardados()]
}

export function todosLosPonentes(): readonly Ponente[] {
  return [...PONENTES_DE_EJEMPLO, ...leerPonentesGuardados()]
}

export function agregarEvento(evento: Evento): void {
  escribirJson(CLAVE_EVENTOS, [...leerEventosGuardados(), evento])
}

export function agregarPonente(ponente: Ponente): void {
  escribirJson(CLAVE_PONENTES, [...leerPonentesGuardados(), ponente])
}
