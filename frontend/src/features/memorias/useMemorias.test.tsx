import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVE_MEMORIAS } from './almacenamiento'
import type { Memoria } from './data'
import type { ResultadoMemoria } from './memorias'
import { useMemorias } from './useMemorias'

describe('useMemorias', () => {
  it('arranca con la semilla del fixture', () => {
    const { result } = renderHook(() => useMemorias())

    expect(result.current.memorias.some((memoria) => memoria.id === 'mem-alc-01')).toBe(true)
  })

  it('generar agrega una memoria válida y la deja disponible sin recargar', () => {
    const { result } = renderHook(() => useMemorias())
    const antes = result.current.memorias.length

    let resultado: ResultadoMemoria | undefined
    act(() => {
      resultado = result.current.generar('cnf-1', 'pla-1', 'Nueva memoria')
    })

    expect(resultado).toMatchObject({ ok: true })
    expect(result.current.memorias).toHaveLength(antes + 1)
  })

  it('generar persiste de inmediato', () => {
    const { result } = renderHook(() => useMemorias())

    act(() => {
      result.current.generar('cnf-1', 'pla-1', 'Nueva memoria')
    })

    expect(sessionStorage.getItem(CLAVE_MEMORIAS)).toContain('Nueva memoria')
  })

  it('generar sin nombre no agrega nada y devuelve el código de error', () => {
    const { result } = renderHook(() => useMemorias())
    const antes = result.current.memorias.length

    let resultado: ResultadoMemoria | undefined
    act(() => {
      resultado = result.current.generar('cnf-1', 'pla-1', '')
    })

    expect(resultado).toEqual({ ok: false, codigo: 'MEM_NOMBRE_REQUERIDO' })
    expect(result.current.memorias).toHaveLength(antes)
  })

  it('eliminar la quita del estado y de sessionStorage', () => {
    const { result } = renderHook(() => useMemorias())

    let nueva: Memoria | undefined
    act(() => {
      const resultado = result.current.generar('cnf-1', 'pla-1', 'Para borrar')
      nueva = resultado.ok ? resultado.memoria : undefined
    })

    act(() => {
      result.current.eliminar(nueva!.id)
    })

    expect(result.current.memorias.some((memoria) => memoria.id === nueva!.id)).toBe(false)
  })
})
