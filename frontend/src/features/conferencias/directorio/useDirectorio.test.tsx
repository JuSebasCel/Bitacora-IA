import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVE_EVENTOS, CLAVE_PONENTES } from './almacenamiento'
import { useDirectorio } from './useDirectorio'

describe('useDirectorio', () => {
  it('arranca con la semilla de eventos y ponentes del fixture', () => {
    const { result } = renderHook(() => useDirectorio())

    expect(result.current.eventos.some((evento) => evento.nombre === 'Simposio Andino de Investigación Aplicada')).toBe(true)
    expect(result.current.ponentes.some((ponente) => ponente.nombre === 'Mariana Escobar Vallejo')).toBe(true)
  })

  it('deja disponible un evento recién creado sin recargar', () => {
    const { result } = renderHook(() => useDirectorio())

    act(() => {
      result.current.crearEvento('Coloquio de Prueba')
    })

    expect(result.current.eventos.some((evento) => evento.nombre === 'Coloquio de Prueba')).toBe(true)
  })

  it('persiste el evento creado para que sobreviva a un recargado', () => {
    const { result } = renderHook(() => useDirectorio())

    act(() => {
      result.current.crearEvento('Coloquio de Prueba')
    })

    expect(sessionStorage.getItem(CLAVE_EVENTOS)).toContain('Coloquio de Prueba')

    const segundaVisita = renderHook(() => useDirectorio())
    expect(segundaVisita.result.current.eventos.some((evento) => evento.nombre === 'Coloquio de Prueba')).toBe(
      true,
    )
  })

  it('devuelve el código de error y no toca el directorio ante un nombre repetido', () => {
    const { result } = renderHook(() => useDirectorio())
    const antes = result.current.eventos.length

    let codigo = ''
    act(() => {
      const resultado = result.current.crearEvento('Simposio Andino de Investigación Aplicada')
      if (!resultado.ok) {
        codigo = resultado.codigo
      }
    })

    expect(codigo).toBe('DIR_EVENTO_YA_EXISTE')
    expect(result.current.eventos).toHaveLength(antes)
  })

  it('deja disponible un ponente recién creado, asociado a su evento', () => {
    const { result } = renderHook(() => useDirectorio())

    act(() => {
      result.current.crearPonente('evt-saia', 'Persona de Prueba')
    })

    expect(
      result.current.ponentes.some(
        (ponente) => ponente.nombre === 'Persona de Prueba' && ponente.idEvento === 'evt-saia',
      ),
    ).toBe(true)
  })

  it('persiste el ponente creado', () => {
    const { result } = renderHook(() => useDirectorio())

    act(() => {
      result.current.crearPonente('evt-saia', 'Persona de Prueba')
    })

    expect(sessionStorage.getItem(CLAVE_PONENTES)).toContain('Persona de Prueba')
  })

  it('rechaza un ponente repetido en el mismo evento sin tocar el directorio', () => {
    const { result } = renderHook(() => useDirectorio())
    const antes = result.current.ponentes.length

    let codigo = ''
    act(() => {
      const resultado = result.current.crearPonente('evt-saia', 'Mariana Escobar Vallejo')
      if (!resultado.ok) {
        codigo = resultado.codigo
      }
    })

    expect(codigo).toBe('DIR_PONENTE_YA_EXISTE')
    expect(result.current.ponentes).toHaveLength(antes)
  })
})
