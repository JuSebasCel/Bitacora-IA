import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_OCULTAS, idsOcultosDe, ocultarConferencia } from './almacenamiento'

beforeEach(() => {
  sessionStorage.clear()
})

describe('idsOcultosDe', () => {
  it('sin nada guardado, no hay ninguna conferencia oculta', () => {
    expect(idsOcultosDe('usr-zuluaga')).toEqual([])
  })

  it('el espacio de una persona no se cruza con el de otra', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-alcantara')).toEqual([])
  })
})

describe('ocultarConferencia', () => {
  it('agrega el id a la lista de esa persona', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01'])
  })

  it('acumula varias conferencias ocultas de la misma persona', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')
    ocultarConferencia('usr-zuluaga', 'cnf-zul-02')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01', 'cnf-zul-02'])
  })

  it('ocultar la misma conferencia dos veces no la duplica', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01'])
  })

  it('sobrevive a una nueva lectura, como cualquier dato persistido', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01'])
    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01'])
  })
})

describe('almacenamiento corrupto', () => {
  it('un valor que no es un mapa de listas se descarta en silencio', () => {
    sessionStorage.setItem(CLAVE_OCULTAS, JSON.stringify({ 'usr-zuluaga': 'no-es-una-lista' }))

    expect(idsOcultosDe('usr-zuluaga')).toEqual([])
  })

  it('JSON corrupto se descarta sin romper la lectura', () => {
    sessionStorage.setItem(CLAVE_OCULTAS, '{ esto no es JSON')

    expect(idsOcultosDe('usr-zuluaga')).toEqual([])
  })
})
