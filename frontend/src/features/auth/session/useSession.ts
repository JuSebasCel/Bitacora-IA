import { useContext } from 'react'
import { ContextoSesion } from './contexto'
import type { ValorSesion } from './tipos'

export function useSession(): ValorSesion {
  const valor = useContext(ContextoSesion)

  if (valor === null) {
    throw new Error('useSession debe usarse dentro de un SessionProvider')
  }

  return valor
}
