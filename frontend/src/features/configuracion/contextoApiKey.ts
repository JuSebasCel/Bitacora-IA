import { createContext } from 'react'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

/**
 * Para qué se usa una clave: `analisis` transcribe, analiza y redacta las
 * memorias; `chat` responde en el chat. La de chat es opcional: sin ella,
 * el chat usa la de análisis.
 */
export type PropositoDeClave = 'analisis' | 'chat'

export type ValorDeApiKey = {
  /** La clave de análisis: sin ella no se puede cargar nada. */
  readonly clave: string | null
  readonly claveDeChat: string | null
  readonly cargando: boolean
  readonly guardar: (clave: string, proposito?: PropositoDeClave) => Promise<ResultadoDeAccion>
  readonly borrar: (proposito?: PropositoDeClave) => Promise<ResultadoDeAccion>
}

export const ContextoApiKey = createContext<ValorDeApiKey | null>(null)
