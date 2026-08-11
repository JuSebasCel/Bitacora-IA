import { describe, expect, it } from 'vitest'
import { CUENTAS_DE_EJEMPLO } from './cuentas.fixture'

describe('fixture de cuentas de ejemplo', () => {
  it('tiene al menos tres cuentas', () => {
    expect(CUENTAS_DE_EJEMPLO.length).toBeGreaterThanOrEqual(3)
  })

  it('cada cuenta trae id, nombre, correo y contraseña no vacíos', () => {
    for (const cuenta of CUENTAS_DE_EJEMPLO) {
      expect(cuenta.id.trim().length).toBeGreaterThan(0)
      expect(cuenta.nombre.trim().length).toBeGreaterThan(0)
      expect(cuenta.correo.trim().length).toBeGreaterThan(0)
      expect(cuenta.contrasena.trim().length).toBeGreaterThan(0)
    }
  })

  it('no repite ids ni correos', () => {
    const ids = CUENTAS_DE_EJEMPLO.map((cuenta) => cuenta.id)
    const correos = CUENTAS_DE_EJEMPLO.map((cuenta) => cuenta.correo.toLowerCase())

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(correos).size).toBe(correos.length)
  })

  it('guarda los correos normalizados, en minúsculas y sin espacios', () => {
    for (const cuenta of CUENTAS_DE_EJEMPLO) {
      expect(cuenta.correo).toBe(cuenta.correo.trim().toLowerCase())
      expect(cuenta.correo).toContain('@')
    }
  })

  it('no usa nombres ni correos de relleno genéricos', () => {
    const prohibidos = [
      'john doe',
      'jane doe',
      'usuario uno',
      'usuario dos',
      'test@test.com',
      'usuario@ejemplo.com',
      'foo',
      'bar',
      'lorem',
    ]

    for (const cuenta of CUENTAS_DE_EJEMPLO) {
      const texto = `${cuenta.nombre} ${cuenta.correo}`.toLowerCase()
      for (const prohibido of prohibidos) {
        expect(texto).not.toContain(prohibido)
      }
    }
  })
})
