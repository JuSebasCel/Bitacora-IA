import { describe, expect, it } from 'vitest'
import { CRITERIOS_POR_DEFECTO } from './filtros'
import type { CriteriosDeMemorias } from './filtros'
import { escribirCriteriosDeMemorias, leerCriteriosDeMemorias } from './parametros'

/*
  Mismo criterio que `catalogo/parametros.ts`: los criterios viven en la URL,
  así que la entrada es texto que cualquiera puede escribir a mano y nada de
  aquí lanza.

  A diferencia del catálogo, `PantallaMemorias` ya usa `?conferencia=<id>`
  para preseleccionar una conferencia al abrir el panel de generar (ver
  `PantallaMemorias.tsx`). `escribirCriteriosDeMemorias` tiene que conservar
  ese parámetro si estaba presente, o escribir en la barra de búsqueda
  rompería esa preselección.
*/

describe('leerCriteriosDeMemorias', () => {
  it('devuelve los criterios por defecto cuando no hay parámetros', () => {
    expect(leerCriteriosDeMemorias(new URLSearchParams(''))).toEqual(CRITERIOS_POR_DEFECTO)
  })

  it('lee la búsqueda de su parámetro', () => {
    const criterios = leerCriteriosDeMemorias(new URLSearchParams('buscar=modelos'))

    expect(criterios.busqueda).toBe('modelos')
  })

  it('recorta espacios de la búsqueda', () => {
    const criterios = leerCriteriosDeMemorias(new URLSearchParams('buscar=%20modelos%20'))

    expect(criterios.busqueda).toBe('modelos')
  })
})

describe('escribirCriteriosDeMemorias', () => {
  it('con los criterios por defecto, no agrega ningún parámetro', () => {
    expect(escribirCriteriosDeMemorias(CRITERIOS_POR_DEFECTO).toString()).toBe('')
  })

  it('agrega la búsqueda cuando no está vacía', () => {
    const criterios: CriteriosDeMemorias = { busqueda: 'modelos' }

    expect(escribirCriteriosDeMemorias(criterios).get('buscar')).toBe('modelos')
  })

  it('recorta espacios de la búsqueda antes de escribirla', () => {
    const params = escribirCriteriosDeMemorias({ busqueda: '  ia  ' })

    expect(params.get('buscar')).toBe('ia')
  })

  it('leer lo que se acaba de escribir devuelve los mismos criterios (ida y vuelta)', () => {
    const original: CriteriosDeMemorias = { busqueda: 'modelos' }

    const params = escribirCriteriosDeMemorias(original)

    expect(leerCriteriosDeMemorias(params)).toEqual(original)
  })

  it('conserva ?conferencia= si ya estaba presente en la URL anterior', () => {
    const anteriores = new URLSearchParams('conferencia=cnf-alc-01')

    const params = escribirCriteriosDeMemorias({ busqueda: 'modelos' }, anteriores)

    expect(params.get('conferencia')).toBe('cnf-alc-01')
    expect(params.get('buscar')).toBe('modelos')
  })

  it('sin ?conferencia= previo, no lo inventa', () => {
    const params = escribirCriteriosDeMemorias({ busqueda: 'modelos' }, new URLSearchParams(''))

    expect(params.has('conferencia')).toBe(false)
  })

  it('sin params anteriores, tampoco falla', () => {
    expect(() => escribirCriteriosDeMemorias({ busqueda: 'modelos' })).not.toThrow()
  })
})
