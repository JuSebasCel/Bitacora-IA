import { useContext } from 'react'
import { ContextoApiKey } from './contextoApiKey'
import type { ValorDeApiKey } from './contextoApiKey'

export function useApiKey(): ValorDeApiKey {
  const valor = useContext(ContextoApiKey)

  if (valor === null) {
    throw new Error('useApiKey debe usarse dentro de un ProveedorDeApiKey')
  }

  return valor
}
