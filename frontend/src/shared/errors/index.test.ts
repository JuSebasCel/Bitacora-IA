import { describe, expect, it } from 'vitest'
import { CODIGOS_DE_ERROR, mensajeDeError, type CodigoError } from './index'

describe('catálogo de errores', () => {
  it('resuelve cada código conocido a un mensaje no vacío', () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      const mensaje = mensajeDeError(codigo)
      expect(mensaje.trim().length).toBeGreaterThan(0)
    }
  })

  it('no incrusta el código crudo dentro del mensaje de un código conocido', () => {
    for (const codigo of CODIGOS_DE_ERROR) {
      expect(mensajeDeError(codigo)).not.toContain(codigo)
    }
  })

  it('devuelve mensajes distintos para códigos distintos', () => {
    const mensajes = CODIGOS_DE_ERROR.map((codigo: CodigoError) => mensajeDeError(codigo))
    expect(new Set(mensajes).size).toBe(mensajes.length)
  })

  it('cae a un mensaje genérico cuando el código es desconocido', () => {
    const mensaje = mensajeDeError('FALLA_INTERNA_DE_BASE_DE_DATOS')

    expect(mensaje.trim().length).toBeGreaterThan(0)
    expect(mensaje).not.toContain('FALLA_INTERNA_DE_BASE_DE_DATOS')
  })

  it('el mensaje genérico no filtra el código ni detalle técnico', () => {
    const codigosSospechosos = [
      'AUTH_TOKEN_EXPIRADO',
      'DB_CONNECTION_REFUSED',
      'stack: Error at line 42',
      '',
      'undefined',
    ]

    for (const codigo of codigosSospechosos) {
      const mensaje = mensajeDeError(codigo)
      expect(mensaje).toBe(mensajeDeError('OTRO_CODIGO_TOTALMENTE_DISTINTO'))
      if (codigo.length > 0) {
        expect(mensaje).not.toContain(codigo)
      }
      expect(mensaje).not.toMatch(/_[A-Z]/)
      expect(mensaje.toLowerCase()).not.toContain('error:')
      expect(mensaje.toLowerCase()).not.toContain('stack')
      expect(mensaje.toLowerCase()).not.toContain('undefined')
    }
  })
})
