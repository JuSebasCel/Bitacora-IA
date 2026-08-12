import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_PLANTILLAS } from './almacenamiento'
import { usePlantillas } from './usePlantillas'

beforeEach(() => {
  sessionStorage.clear()
})

describe('usePlantillas', () => {
  it('arranca con la semilla del fixture', () => {
    const { result } = renderHook(() => usePlantillas())

    expect(result.current.plantillas.some((plantilla) => plantilla.id === 'pla-memoria-estandar')).toBe(
      true,
    )
  })

  it('crear devuelve una plantilla nueva y la deja disponible sin recargar', () => {
    const { result } = renderHook(() => usePlantillas())

    let nueva: ReturnType<typeof result.current.crear> | undefined
    act(() => {
      nueva = result.current.crear()
    })

    expect(nueva?.id.length).toBeGreaterThan(0)
    expect(result.current.plantillas.some((plantilla) => plantilla.id === nueva?.id)).toBe(true)
  })

  it('crear persiste la nueva plantilla', () => {
    const { result } = renderHook(() => usePlantillas())

    let nueva: ReturnType<typeof result.current.crear> | undefined
    act(() => {
      nueva = result.current.crear()
    })

    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain(nueva?.id ?? '')
  })

  it('renombrarPlantilla actualiza el nombre y lo persiste', () => {
    const { result } = renderHook(() => usePlantillas())
    let id = ''
    act(() => {
      id = result.current.crear().id
    })

    act(() => {
      result.current.renombrarPlantilla(id, 'Memoria del taller')
    })

    expect(result.current.plantillas.find((plantilla) => plantilla.id === id)?.nombre).toBe(
      'Memoria del taller',
    )
  })

  it('cambiarColores actualiza los dos colores', () => {
    const { result } = renderHook(() => usePlantillas())
    let id = ''
    act(() => {
      id = result.current.crear().id
    })

    act(() => {
      result.current.cambiarColores(id, '#111111', '#222222')
    })

    const plantilla = result.current.plantillas.find((candidata) => candidata.id === id)
    expect(plantilla?.colorPrincipal).toBe('#111111')
    expect(plantilla?.colorSecundario).toBe('#222222')
  })

  it('agregarElementoDeTexto añade un elemento a la plantilla correcta', () => {
    const { result } = renderHook(() => usePlantillas())
    let id = ''
    act(() => {
      id = result.current.crear().id
    })

    act(() => {
      result.current.agregarElementoDeTexto(id)
    })

    expect(result.current.plantillas.find((plantilla) => plantilla.id === id)?.elementos).toHaveLength(1)
  })

  it('quitarElemento elimina el elemento por id', () => {
    const { result } = renderHook(() => usePlantillas())
    let id = ''
    act(() => {
      id = result.current.crear().id
    })
    act(() => {
      result.current.agregarElementoDeTexto(id)
    })
    const idElemento = result.current.plantillas.find((plantilla) => plantilla.id === id)?.elementos[0]?.id
    if (idElemento === undefined) throw new Error('falta el elemento')

    act(() => {
      result.current.quitarElemento(id, idElemento)
    })

    expect(result.current.plantillas.find((plantilla) => plantilla.id === id)?.elementos).toHaveLength(0)
  })

  it('eliminar quita la plantilla del estado y de sessionStorage', () => {
    const { result } = renderHook(() => usePlantillas())
    let id = ''
    act(() => {
      id = result.current.crear().id
    })

    act(() => {
      result.current.eliminar(id)
    })

    expect(result.current.plantillas.some((plantilla) => plantilla.id === id)).toBe(false)
  })
})
