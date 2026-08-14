import { createContext } from 'react'
import type { ValorTema } from './tipos'

/*
  Mismo motivo que `ContextoSesion`: vive en su propio archivo para que el
  refresco en caliente de Vite no pierda el estado, y el valor por defecto es
  `null` para que `useTema` distinga "sin proveedor" de "con proveedor".
*/
export const ContextoTema = createContext<ValorTema | null>(null)
