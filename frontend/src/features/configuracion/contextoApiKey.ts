import { createContext } from 'react'

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeApiKey = {
  readonly clave: string | null
  readonly cargando: boolean
  readonly guardar: (clave: string) => Promise<ResultadoDeAccion>
  readonly borrar: () => Promise<ResultadoDeAccion>
}

export const ContextoApiKey = createContext<ValorDeApiKey | null>(null)
