import { createContext } from 'react'
import type { ValorSesion } from './tipos'

/*
  Vive en su propio archivo para que SessionProvider.tsx exporte solo el
  componente y el refresco en caliente de Vite no pierda el estado de la sesión.
  El valor por defecto es null a propósito: así useSession puede distinguir "no
  hay provider" de "hay provider sin sesión abierta".
*/
export const ContextoSesion = createContext<ValorSesion | null>(null)
