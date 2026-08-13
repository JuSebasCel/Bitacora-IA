import { describe, expect, it } from 'vitest'
import { CRITERIOS_POR_DEFECTO } from './filtros'
import type { CriteriosDeCatalogo } from './filtros'
import { escribirCriteriosDeCatalogo, leerCriteriosDeCatalogo } from './parametros'

/*
  Mismo criterio que `conferencias/query/parametros.ts`: los filtros del
  catálogo viven en la URL, así que la entrada es texto que cualquiera puede
  escribir a mano. `leerCriteriosDeCatalogo` no lanza nunca — un valor que no
  reconoce cae al valor por defecto.
*/

const TEMAS_CONOCIDOS = ['Modelos de lenguaje', 'Sesgos algorítmicos']
const EVENTOS_CONOCIDOS = ['Simposio Andino de Investigación Aplicada']

function leer(
  consulta: string,
  temasConocidos?: readonly string[],
  eventosConocidos?: readonly string[],
): CriteriosDeCatalogo {
  return leerCriteriosDeCatalogo(new URLSearchParams(consulta), temasConocidos, eventosConocidos)
}

describe('leerCriteriosDeCatalogo', () => {
  it('devuelve los criterios por defecto cuando no hay parámetros', () => {
    expect(leer('')).toEqual(CRITERIOS_POR_DEFECTO)
  })

  it('lee cada criterio de su parámetro', () => {
    const criterios = leer('buscar=algoritmicos&tipo=cita-textual&estado=validada')

    expect(criterios.busqueda).toBe('algoritmicos')
    expect(criterios.tipoDeUnidad).toBe('cita-textual')
    expect(criterios.estado).toBe('validada')
  })

  it('cae al valor por defecto ante un tipo de unidad o estado que no reconoce', () => {
    const criterios = leer('tipo=algo-inventado&estado=en-revision-por-alguien')

    expect(criterios.tipoDeUnidad).toBeNull()
    expect(criterios.estado).toBe(CRITERIOS_POR_DEFECTO.estado)
  })

  it('lee tema y evento cuando están entre los conocidos', () => {
    const criterios = leer(
      'tema=Modelos+de+lenguaje&evento=Simposio+Andino+de+Investigación+Aplicada',
      TEMAS_CONOCIDOS,
      EVENTOS_CONOCIDOS,
    )

    expect(criterios.tema).toBe('Modelos de lenguaje')
    expect(criterios.evento).toBe('Simposio Andino de Investigación Aplicada')
  })

  it('descarta un tema o evento que no está entre los conocidos', () => {
    const criterios = leer('tema=Un+tema+inventado', TEMAS_CONOCIDOS)

    expect(criterios.tema).toBeNull()
  })

  it('conserva tema y evento tal cual cuando no se le pasa con qué contrastarlos', () => {
    expect(leer('tema=Lo+que+sea').tema).toBe('Lo que sea')
  })

  it('un tema o evento vacío cae a null, no a cadena vacía', () => {
    expect(leer('tema=').tema).toBeNull()
    expect(leer('evento=   ').evento).toBeNull()
  })
})

describe('escribirCriteriosDeCatalogo', () => {
  it('con los criterios por defecto, no agrega ningún parámetro', () => {
    expect(escribirCriteriosDeCatalogo(CRITERIOS_POR_DEFECTO).toString()).toBe('')
  })

  it('agrega solo los criterios que se apartan del valor por defecto', () => {
    const criterios: CriteriosDeCatalogo = {
      ...CRITERIOS_POR_DEFECTO,
      tema: 'Sesgos algorítmicos',
      estado: 'validada',
    }

    const params = escribirCriteriosDeCatalogo(criterios)

    expect(params.get('tema')).toBe('Sesgos algorítmicos')
    expect(params.get('estado')).toBe('validada')
    expect(params.has('tipo')).toBe(false)
    expect(params.has('evento')).toBe(false)
    expect(params.has('buscar')).toBe(false)
  })

  it('recorta espacios de la búsqueda antes de escribirla', () => {
    const params = escribirCriteriosDeCatalogo({ ...CRITERIOS_POR_DEFECTO, busqueda: '  ia  ' })

    expect(params.get('buscar')).toBe('ia')
  })

  it('leer lo que se acaba de escribir devuelve los mismos criterios (ida y vuelta)', () => {
    const original: CriteriosDeCatalogo = {
      busqueda: 'modelos',
      tema: 'Modelos de lenguaje',
      tipoDeUnidad: 'metodo',
      evento: 'Simposio Andino de Investigación Aplicada',
      estado: 'automatica',
    }

    const params = escribirCriteriosDeCatalogo(original)
    const releido = leerCriteriosDeCatalogo(params, [original.tema ?? ''], [original.evento ?? ''])

    expect(releido).toEqual(original)
  })
})
