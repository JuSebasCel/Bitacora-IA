import { describe, expect, it } from 'vitest'
import type { Conferencia, Ficha } from '@/features/conferencias/data'
import type { Tema } from '@/features/taxonomia'
import { mapearConferenciaACampos } from './mapeo'

const CONFERENCIA: Conferencia = {
  id: 'cnf-prueba',
  titulo: 'Charla de prueba',
  ponente: 'Rodrigo Peñaloza',
  evento: 'Evento de prueba',
  codigoDeEvento: 'PRU-2026-01',
  fechaDelEvento: '2026-05-01',
  duracionEnSegundos: 1200,
  maximoDeFichas: null,
  idDueno: 'usr-prueba',
  estado: 'procesada',
  idTemaPrincipal: 'tem-de-prueba',
  resumen: 'Resumen general de la charla.',
  descripcion: '',
  fuente: 'audio',
  comparticiones: [],
}

/* La conferencia guarda el id del tema; el nombre para la memoria sale de este pool. */
const TEMAS: readonly Tema[] = [{ id: 'tem-de-prueba', nombre: 'Un tema de prueba' }]

function ficha(datos: Partial<Ficha>): Ficha {
  return {
    id: 'fch-prueba',
    idConferencia: CONFERENCIA.id,
    fragmento: 'Fragmento de prueba.',
    condensado: '',
    hablante: CONFERENCIA.ponente,
    segundoInicio: 0,
    segundoFin: 10,
    idTema: CONFERENCIA.idTemaPrincipal,
    tipoDeUnidad: 'dato-de-impacto',
    estadoDeValidacion: 'automatica',
    confianzaAutomatica: 0.9,
    contextoMinimo: 'Contexto.',
    ...datos,
  }
}

describe('mapearConferenciaACampos', () => {
  it('nombre_ponente, fecha_evento y tema_principal salen directo de la conferencia', () => {
    const registro = mapearConferenciaACampos(CONFERENCIA, [], TEMAS)

    expect(registro.nombre_ponente).toEqual({ parrafo: 'Rodrigo Peñaloza', lista: ['Rodrigo Peñaloza'] })
    expect(registro.fecha_evento?.parrafo).toContain('2026')
    expect(registro.tema_principal).toEqual({ parrafo: 'Un tema de prueba', lista: ['Un tema de prueba'] })
  })

  it('cita_destacada usa las fichas de tipo cita-textual de esa conferencia', () => {
    const fichas = [
      ficha({ id: 'fch-1', tipoDeUnidad: 'cita-textual', fragmento: 'Primera cita.' }),
      ficha({ id: 'fch-2', tipoDeUnidad: 'cita-textual', fragmento: 'Segunda cita.' }),
    ]

    const registro = mapearConferenciaACampos(CONFERENCIA, fichas, TEMAS)

    expect(registro.cita_destacada).toEqual({
      parrafo: 'Primera cita.',
      lista: ['Primera cita.', 'Segunda cita.'],
    })
  })

  it('sin fichas de cita-textual, cita_destacada queda ausente del registro', () => {
    const registro = mapearConferenciaACampos(CONFERENCIA, [ficha({ tipoDeUnidad: 'metodo' })], TEMAS)

    expect(registro.cita_destacada).toBeUndefined()
  })

  it('entre varias fichas de cita-textual, prioriza las ya validadas', () => {
    const fichas = [
      ficha({ id: 'fch-1', tipoDeUnidad: 'cita-textual', fragmento: 'Sin validar.', estadoDeValidacion: 'pendiente' }),
      ficha({ id: 'fch-2', tipoDeUnidad: 'cita-textual', fragmento: 'Validada.', estadoDeValidacion: 'validada' }),
    ]

    const registro = mapearConferenciaACampos(CONFERENCIA, fichas, TEMAS)

    expect(registro.cita_destacada).toEqual({ parrafo: 'Validada.', lista: ['Validada.'] })
  })

  it('resumen_metodo usa las fichas de tipo método cuando existen', () => {
    const fichas = [ficha({ tipoDeUnidad: 'metodo', fragmento: 'Se usó una metodología mixta.' })]

    const registro = mapearConferenciaACampos(CONFERENCIA, fichas, TEMAS)

    expect(registro.resumen_metodo).toEqual({
      parrafo: 'Se usó una metodología mixta.',
      lista: ['Se usó una metodología mixta.'],
    })
  })

  it('sin fichas de método pero con resumen de la conferencia, usa el resumen', () => {
    const registro = mapearConferenciaACampos(CONFERENCIA, [], TEMAS)

    expect(registro.resumen_metodo).toEqual({
      parrafo: 'Resumen general de la charla.',
      lista: ['Resumen general de la charla.'],
    })
  })

  it('sin fichas de método y sin resumen, resumen_metodo queda ausente del registro', () => {
    const registro = mapearConferenciaACampos({ ...CONFERENCIA, resumen: '' }, [], TEMAS)

    expect(registro.resumen_metodo).toBeUndefined()
  })

  it('ignora fichas que pertenecen a otra conferencia', () => {
    const fichas = [ficha({ tipoDeUnidad: 'cita-textual', idConferencia: 'cnf-otra' })]

    const registro = mapearConferenciaACampos(CONFERENCIA, fichas, TEMAS)

    expect(registro.cita_destacada).toBeUndefined()
  })
})
