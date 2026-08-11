import { describe, expect, test } from 'vitest'
import { esCorreoValido, resumirContrasena } from './credenciales'

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

describe('resumirContrasena', () => {
  test('devuelve un resumen hexadecimal de 64 caracteres', async () => {
    const resumen = await resumirContrasena('Anfora-2026')

    expect(resumen).not.toBeNull()
    expect(resumen).toMatch(/^[0-9a-f]{64}$/)
  })

  test('es determinista para la misma contraseña', async () => {
    const primero = await resumirContrasena('Simposio-Andes')
    const segundo = await resumirContrasena('Simposio-Andes')

    expect(primero).toBe(segundo)
  })

  test('cambia con la contraseña y no la contiene', async () => {
    const resumen = await resumirContrasena('Coloquio-Norte')
    const otro = await resumirContrasena('Coloquio-Norte ')

    expect(resumen).not.toBe(otro)
    expect(resumen).not.toContain('Coloquio')
  })
})
