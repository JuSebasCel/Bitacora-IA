import { beforeEach, describe, expect, it } from 'vitest'
import {
  agregarEvento,
  agregarPonente,
  CLAVE_EVENTOS,
  CLAVE_PONENTES,
  todosLosEventos,
  todosLosPonentes,
} from './almacenamiento'

beforeEach(() => {
  sessionStorage.clear()
})

describe('todosLosEventos', () => {
  it('sin nada guardado, devuelve la semilla del fixture', () => {
    const eventos = todosLosEventos()

    expect(eventos.some((evento) => evento.nombre === 'Simposio Andino de Investigación Aplicada')).toBe(
      true,
    )
  })

  it('lo creado se fusiona con la semilla, no la reemplaza', () => {
    agregarEvento({ id: 'evt-nuevo', nombre: 'Coloquio de Prueba' })

    const eventos = todosLosEventos()

    expect(eventos.some((evento) => evento.nombre === 'Simposio Andino de Investigación Aplicada')).toBe(
      true,
    )
    expect(eventos.some((evento) => evento.nombre === 'Coloquio de Prueba')).toBe(true)
  })

  it('un valor corrupto en sessionStorage se descarta y deja solo la semilla', () => {
    sessionStorage.setItem(CLAVE_EVENTOS, '{ esto no es JSON')

    const eventos = todosLosEventos()

    expect(eventos.some((evento) => evento.nombre === 'Simposio Andino de Investigación Aplicada')).toBe(
      true,
    )
  })
})

describe('agregarEvento', () => {
  it('sobrevive a una nueva lectura', () => {
    agregarEvento({ id: 'evt-nuevo', nombre: 'Coloquio de Prueba' })

    expect(todosLosEventos().map((evento) => evento.id)).toContain('evt-nuevo')
    expect(todosLosEventos().map((evento) => evento.id)).toContain('evt-nuevo')
  })
})

describe('todosLosPonentes', () => {
  it('sin nada guardado, devuelve la semilla del fixture', () => {
    const ponentes = todosLosPonentes()

    expect(ponentes.some((ponente) => ponente.nombre === 'Mariana Escobar Vallejo')).toBe(true)
  })

  it('lo creado se fusiona con la semilla', () => {
    agregarPonente({ id: 'pon-nuevo', nombre: 'Persona de Prueba', idEvento: 'evt-saia' })

    const ponentes = todosLosPonentes()

    expect(ponentes.some((ponente) => ponente.nombre === 'Persona de Prueba')).toBe(true)
    expect(ponentes.some((ponente) => ponente.nombre === 'Mariana Escobar Vallejo')).toBe(true)
  })

  it('un valor corrupto en sessionStorage se descarta y deja solo la semilla', () => {
    sessionStorage.setItem(CLAVE_PONENTES, JSON.stringify([{ nombre: 'sin id ni evento' }]))

    const ponentes = todosLosPonentes()

    expect(ponentes.some((ponente) => ponente.nombre === 'Mariana Escobar Vallejo')).toBe(true)
    expect(ponentes.some((ponente) => ponente.nombre === 'sin id ni evento')).toBe(false)
  })
})
