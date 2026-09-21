import { createContext } from 'react'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

/**
 * Para qué se usa una clave. Cada una puede ser de una cuenta distinta del
 * proveedor (en Groq, cada cuenta tiene sus propios límites). La que falte
 * se cubre con la primera que haya, en este mismo orden.
 */
export type PropositoDeClave = 'transcripcion' | 'fichas' | 'chat'

export const PROPOSITOS: readonly PropositoDeClave[] = ['transcripcion', 'fichas', 'chat']

/** Lo que decidió la cuenta administradora, y el cupo común de hoy. */
export type AjustesDeIa = {
  /** Si todos usan las claves de la administración. */
  readonly clavesCompartidas: boolean
  readonly soyAdministracion: boolean
  readonly limiteDiarioDeAudioS: number
  readonly audioUsadoHoyS: number
}

export type ValorDeApiKey = {
  readonly claves: Readonly<Record<PropositoDeClave, string | null>>
  /**
   * La primera clave que haya, en el orden de respaldo. Se conserva con este
   * nombre porque es lo que los avisos de "falta la clave" siempre miraron.
   */
  readonly clave: string | null
  /**
   * Si esta persona puede usar la IA: con alguna clave propia, o porque la
   * administración comparte las suyas. Es lo que deciden los avisos.
   */
  readonly puedeUsarIa: boolean
  readonly ajustes: AjustesDeIa
  readonly cargando: boolean
  readonly guardar: (clave: string, proposito?: PropositoDeClave) => Promise<ResultadoDeAccion>
  readonly borrar: (proposito?: PropositoDeClave) => Promise<ResultadoDeAccion>
  /** Solo la administración: que todos usen sus claves, o cada quien las suyas. */
  readonly cambiarClavesCompartidas: (compartidas: boolean) => Promise<ResultadoDeAccion>
}

export const AJUSTES_POR_DEFECTO: AjustesDeIa = {
  clavesCompartidas: false,
  soyAdministracion: false,
  limiteDiarioDeAudioS: 0,
  audioUsadoHoyS: 0,
}

export const ContextoApiKey = createContext<ValorDeApiKey | null>(null)
