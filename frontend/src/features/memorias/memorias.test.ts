import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_MEMORIA } from '@/shared/errors'
import { crearMemoria } from './memorias'

describe('crearMemoria', () => {
  it('con conferencia, plantilla y nombre válidos, crea la memoria', () => {
    const resultado = crearMemoria('cnf-1', 'pla-1', 'Memoria de la charla')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.memoria).toMatchObject({
        idConferencia: 'cnf-1',
        idPlantilla: 'pla-1',
        nombre: 'Memoria de la charla',
      })
      expect(resultado.memoria.id.length).toBeGreaterThan(0)
      expect(new Date(resultado.memoria.generadaEl).toString()).not.toBe('Invalid Date')
    }
  })

  it('sin conferencia, devuelve MEM_CONFERENCIA_REQUERIDA', () => {
    const resultado = crearMemoria('', 'pla-1', 'Nombre')

    expect(resultado).toEqual({ ok: false, codigo: 'MEM_CONFERENCIA_REQUERIDA' })
  })

  it('sin plantilla, devuelve MEM_PLANTILLA_REQUERIDA', () => {
    const resultado = crearMemoria('cnf-1', '', 'Nombre')

    expect(resultado).toEqual({ ok: false, codigo: 'MEM_PLANTILLA_REQUERIDA' })
  })

  it('sin nombre (o solo espacios), devuelve MEM_NOMBRE_REQUERIDO', () => {
    expect(crearMemoria('cnf-1', 'pla-1', '')).toEqual({ ok: false, codigo: 'MEM_NOMBRE_REQUERIDO' })
    expect(crearMemoria('cnf-1', 'pla-1', '   ')).toEqual({ ok: false, codigo: 'MEM_NOMBRE_REQUERIDO' })
  })

  it('con un nombre demasiado largo, devuelve MEM_NOMBRE_MUY_LARGO', () => {
    const nombreLargo = 'x'.repeat(LARGO_MAXIMO_DE_MEMORIA + 1)

    const resultado = crearMemoria('cnf-1', 'pla-1', nombreLargo)

    expect(resultado).toEqual({ ok: false, codigo: 'MEM_NOMBRE_MUY_LARGO' })
  })

  it('recorta espacios sobrantes del nombre', () => {
    const resultado = crearMemoria('cnf-1', 'pla-1', '  Memoria con espacios  ')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.memoria.nombre).toBe('Memoria con espacios')
    }
  })
})
