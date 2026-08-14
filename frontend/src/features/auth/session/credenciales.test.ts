import { describe, expect, test } from 'vitest'
import { esCorreoValido } from './credenciales'

describe('esCorreoValido', () => {
  test('acepta correos con forma razonable', () => {
    expect(esCorreoValido('valentina.alcantara@labanfora.org')).toBe(true)
    expect(esCorreoValido('  joaquin.berrio@labanfora.org  ')).toBe(true)
  })

  test('rechaza las formas que antes pasaban como válidas', () => {
    expect(esCorreoValido('valentina')).toBe(false)
    expect(esCorreoValido('valentina.alcantara@')).toBe(false)
    expect(esCorreoValido('@labanfora.org')).toBe(false)
    expect(esCorreoValido('valentina@labanfora')).toBe(false)
    expect(esCorreoValido('valentina @labanfora.org')).toBe(false)
    expect(esCorreoValido('')).toBe(false)
  })
})
