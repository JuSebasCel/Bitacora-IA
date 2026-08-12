import { describe, expect, it } from 'vitest'
import { crearEvento, crearPonente, ponentesDe } from './directorio'

describe('crearEvento', () => {
  it('crea un evento con id derivado del nombre', () => {
    const resultado = crearEvento([], 'Simposio Andino de Investigación Aplicada')

    expect(resultado).toEqual({
      ok: true,
      evento: { id: expect.any(String), nombre: 'Simposio Andino de Investigación Aplicada' },
    })
  })

  it('rechaza un nombre vacío', () => {
    expect(crearEvento([], '   ')).toEqual({ ok: false, codigo: 'DIR_EVENTO_NOMBRE_REQUERIDO' })
  })

  it('rechaza un nombre demasiado largo', () => {
    const nombre = 'x'.repeat(81)

    expect(crearEvento([], nombre)).toEqual({ ok: false, codigo: 'DIR_EVENTO_NOMBRE_MUY_LARGO' })
  })

  it('acepta un nombre justo en el límite', () => {
    const nombre = 'x'.repeat(80)

    expect(crearEvento([], nombre).ok).toBe(true)
  })

  it('rechaza un nombre ya usado, sin importar tildes ni mayúsculas', () => {
    const existentes = [{ id: 'evt-1', nombre: 'Coloquio de Ciencia de Datos del Norte' }]

    const resultado = crearEvento(existentes, 'COLOQUIO DE CIENCIA DE DATOS DEL NORTE')

    expect(resultado).toEqual({ ok: false, codigo: 'DIR_EVENTO_YA_EXISTE' })
  })

  it('recorta espacios al guardar el nombre', () => {
    const resultado = crearEvento([], '  Jornadas de Ingeniería y Sociedad  ')

    expect(resultado).toEqual({
      ok: true,
      evento: { id: expect.any(String), nombre: 'Jornadas de Ingeniería y Sociedad' },
    })
  })
})

describe('crearPonente', () => {
  it('crea un ponente asociado al evento', () => {
    const resultado = crearPonente([], 'evt-saia', 'Tomás Iriarte Villalba')

    expect(resultado).toEqual({
      ok: true,
      ponente: { id: expect.any(String), nombre: 'Tomás Iriarte Villalba', idEvento: 'evt-saia' },
    })
  })

  it('rechaza un nombre vacío', () => {
    expect(crearPonente([], 'evt-saia', '')).toEqual({
      ok: false,
      codigo: 'DIR_PONENTE_NOMBRE_REQUERIDO',
    })
  })

  it('rechaza un nombre demasiado largo', () => {
    const nombre = 'x'.repeat(61)

    expect(crearPonente([], 'evt-saia', nombre)).toEqual({
      ok: false,
      codigo: 'DIR_PONENTE_NOMBRE_MUY_LARGO',
    })
  })

  it('rechaza un ponente ya registrado en el mismo evento', () => {
    const existentes = [{ id: 'pon-1', nombre: 'Mariana Escobar Vallejo', idEvento: 'evt-saia' }]

    const resultado = crearPonente(existentes, 'evt-saia', 'mariana escobar vallejo')

    expect(resultado).toEqual({ ok: false, codigo: 'DIR_PONENTE_YA_EXISTE' })
  })

  /*
    La misma persona real puede hablar en más de un evento: son dos entradas
    válidas, no un choque. Ya pasa en el fixture (Mariana Escobar Vallejo
    habla tanto en el Simposio Andino como en el Coloquio del Norte).
  */
  it('el mismo nombre en un evento distinto no es un choque', () => {
    const existentes = [{ id: 'pon-1', nombre: 'Mariana Escobar Vallejo', idEvento: 'evt-saia' }]

    const resultado = crearPonente(existentes, 'evt-ccdn', 'Mariana Escobar Vallejo')

    expect(resultado.ok).toBe(true)
  })
})

describe('ponentesDe', () => {
  const TODOS = [
    { id: 'pon-1', nombre: 'Mariana Escobar Vallejo', idEvento: 'evt-saia' },
    { id: 'pon-2', nombre: 'Tomás Iriarte Villalba', idEvento: 'evt-saia' },
    { id: 'pon-3', nombre: 'Lucía Ferreira Nogueira', idEvento: 'evt-ccdn' },
  ]

  it('deja solo los ponentes del evento pedido', () => {
    expect(ponentesDe(TODOS, 'evt-saia').map((ponente) => ponente.id)).toEqual(['pon-1', 'pon-2'])
  })

  it('un evento sin ponentes registrados da una lista vacía', () => {
    expect(ponentesDe(TODOS, 'evt-jis')).toEqual([])
  })
})
