import { useContext } from 'react'
import { ContextoTema } from './ContextoTema'
import type { ValorTema } from './tipos'

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema)

  if (valor === null) {
    throw new Error('useTema debe usarse dentro de un ProveedorDeTema')
  }

  return valor
}
