import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVE_OCULTAS } from './almacenamiento'
import { useConferenciasOcultas } from './useConferenciasOcultas'

const ZULUAGA = 'usr-zuluaga'
const PENALOZA = 'usr-penaloza'

describe('useConferenciasOcultas', () => {
  it('arranca sin ninguna conferencia oculta', () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))

    expect(result.current.idsOcultos).toEqual([])
  })

  it('oculta una conferencia sin recargar', () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))

    act(() => {
      result.current.ocultar('cnf-zul-01')
    })

    expect(result.current.idsOcultos).toEqual(['cnf-zul-01'])
  })

  it('persiste lo ocultado para que sobreviva a un recargado', () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))

    act(() => {
      result.current.ocultar('cnf-zul-01')
    })

    expect(sessionStorage.getItem(CLAVE_OCULTAS)).toContain('cnf-zul-01')

    const segundaVisita = renderHook(() => useConferenciasOcultas(ZULUAGA))
    expect(segundaVisita.result.current.idsOcultos).toEqual(['cnf-zul-01'])
  })

  it('vuelve a mostrar una conferencia oculta, sin recargar y sin dejar rastro guardado', () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))

    act(() => {
      result.current.ocultar('cnf-zul-01')
      result.current.ocultar('cnf-zul-02')
    })

    act(() => {
      result.current.mostrar('cnf-zul-01')
    })

    expect(result.current.idsOcultos).toEqual(['cnf-zul-02'])
    expect(sessionStorage.getItem(CLAVE_OCULTAS)).not.toContain('cnf-zul-01')
  })

  it('cambia de espacio al cambiar de persona', () => {
    const { result, rerender } = renderHook(
      ({ idUsuario }) => useConferenciasOcultas(idUsuario),
      { initialProps: { idUsuario: ZULUAGA } },
    )

    act(() => {
      result.current.ocultar('cnf-zul-01')
    })
    expect(result.current.idsOcultos).toEqual(['cnf-zul-01'])

    rerender({ idUsuario: PENALOZA })

    expect(result.current.idsOcultos).toEqual([])
  })
})
