import { beforeEach, describe, expect, it } from 'vitest'
import {
  CLAVE_OCULTAS,
  idsOcultosDe,
  mostrarConferencia,
  ocultarConferencia,
} from './almacenamiento'

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

/*
  Ocultar sin poder deshacer convertía un clic accidental en el ojo tachado en
  una pérdida definitiva desde la interfaz. `mostrarConferencia` es la vuelta
  atrás, y tiene que dejar el espacio exactamente como estaba antes.
*/
describe('mostrarConferencia', () => {
  it('deshace lo ocultado y deja la lista como estaba', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')
    ocultarConferencia('usr-zuluaga', 'cnf-zul-02')

    mostrarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-02'])
  })

  it('mostrar algo que nunca se ocultó no altera el resto', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')

    mostrarConferencia('usr-zuluaga', 'cnf-que-nadie-ocultó')

    expect(idsOcultosDe('usr-zuluaga')).toEqual(['cnf-zul-01'])
  })

  it('mostrar en un espacio no toca el de otra persona', () => {
    ocultarConferencia('usr-zuluaga', 'cnf-zul-01')
    ocultarConferencia('usr-alcantara', 'cnf-zul-01')

    mostrarConferencia('usr-zuluaga', 'cnf-zul-01')

    expect(idsOcultosDe('usr-alcantara')).toEqual(['cnf-zul-01'])
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
