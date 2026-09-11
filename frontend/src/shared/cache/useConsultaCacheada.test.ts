import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { invalidarCache, invalidarCacheConPrefijo, useConsultaCacheada } from './useConsultaCacheada'

/*
  La caché vive a nivel de módulo (fuera de React, a propósito: así la
  comparten dos componentes que jamás se ven entre sí). Cada prueba usa una
  clave única para no heredar estado de la anterior; no hay un `beforeEach`
  que limpie porque limpiar exigiría exponer un método de "borrar todo" que
  el propio módulo no necesita para funcionar.
*/
let contador = 0
function claveNueva(): string {
  contador += 1
  return `prueba-${contador}`
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useConsultaCacheada', () => {
  it('arranca cargando y sin datos cuando no hay nada en caché', () => {
    const clave = claveNueva()
    const consultar = vi.fn().mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useConsultaCacheada(clave, consultar))

    expect(result.current.cargando).toBe(true)
    expect(result.current.datos).toBeUndefined()
  })

  it('resuelve con los datos y dos de la misma clave no duplican el viaje de red', async () => {
    const clave = claveNueva()
    const consultar = vi.fn().mockResolvedValue({ ok: true, datos: ['a', 'b'] })

    const uno = renderHook(() => useConsultaCacheada(clave, consultar))
    const dos = renderHook(() => useConsultaCacheada(clave, consultar))

    await waitFor(() => expect(uno.result.current.cargando).toBe(false))

    expect(uno.result.current.datos).toEqual(['a', 'b'])
    expect(dos.result.current.datos).toEqual(['a', 'b'])
    expect(consultar).toHaveBeenCalledOnce()
  })

  it('un montaje posterior con la misma clave fresca no vuelve a consultar', async () => {
    const clave = claveNueva()
    const consultar = vi.fn().mockResolvedValue({ ok: true, datos: 'valor' })

    const primero = renderHook(() => useConsultaCacheada(clave, consultar))
    await waitFor(() => expect(primero.result.current.cargando).toBe(false))
    primero.unmount()

    const segundo = renderHook(() => useConsultaCacheada(clave, consultar))

    /* Instantáneo: ya había dato en caché, nunca pasa por "cargando". */
    expect(segundo.result.current.cargando).toBe(false)
    expect(segundo.result.current.datos).toBe('valor')
    expect(consultar).toHaveBeenCalledOnce()
  })

  it('pasado el TTL, un montaje nuevo revalida en segundo plano sin ocultar el dato viejo', async () => {
    const clave = claveNueva()
    const consultar = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, datos: 'viejo' })
      .mockResolvedValueOnce({ ok: true, datos: 'nuevo' })

    const primero = renderHook(() => useConsultaCacheada(clave, consultar, 10))
    await waitFor(() => expect(primero.result.current.datos).toBe('viejo'))
    primero.unmount()

    await new Promise((resolver) => setTimeout(resolver, 20))

    const segundo = renderHook(() => useConsultaCacheada(clave, consultar, 10))

    /* El dato viejo se ve de inmediato -- nunca "cargando" de nuevo -- mientras revalida detrás. */
    expect(segundo.result.current.cargando).toBe(false)
    expect(segundo.result.current.datos).toBe('viejo')

    await waitFor(() => expect(segundo.result.current.datos).toBe('nuevo'))
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('un fallo expone el código sin lanzar y sin data', async () => {
    const clave = claveNueva()
    const consultar = vi.fn().mockResolvedValue({ ok: false, codigo: 'DATOS_SIN_CONEXION' })

    const { result } = renderHook(() => useConsultaCacheada(clave, consultar))

    await waitFor(() => expect(result.current.codigoDeError).toBe('DATOS_SIN_CONEXION'))
    expect(result.current.datos).toBeUndefined()
    expect(result.current.cargando).toBe(false)
  })

  it('invalidar() vuelve a consultar de inmediato, sin esperar el TTL', async () => {
    const clave = claveNueva()
    const consultar = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, datos: 1 })
      .mockResolvedValueOnce({ ok: true, datos: 2 })

    const { result } = renderHook(() => useConsultaCacheada(clave, consultar, 60_000))
    await waitFor(() => expect(result.current.datos).toBe(1))

    act(() => {
      result.current.invalidar()
    })

    await waitFor(() => expect(result.current.datos).toBe(2))
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('con clave null, no consulta y devuelve el hook siempre desactivado', () => {
    const consultar = vi.fn()

    const { result } = renderHook(() => useConsultaCacheada(null, consultar))

    expect(consultar).not.toHaveBeenCalled()
    expect(result.current).toEqual({
      datos: undefined,
      cargando: false,
      codigoDeError: null,
      invalidar: expect.any(Function),
    })
  })

  it('invalidarCache borra una clave puntual y fuerza un nuevo "cargando" al releerla', async () => {
    const clave = claveNueva()
    const consultar = vi.fn().mockResolvedValue({ ok: true, datos: 'x' })

    const primero = renderHook(() => useConsultaCacheada(clave, consultar))
    await waitFor(() => expect(primero.result.current.datos).toBe('x'))
    primero.unmount()

    invalidarCache(clave)

    const segundo = renderHook(() => useConsultaCacheada(clave, consultar))
    expect(segundo.result.current.cargando).toBe(true)
  })

  it('invalidarCacheConPrefijo borra todas las claves de una familia', async () => {
    const prefijo = `familia-${claveNueva()}-`
    const consultar = vi.fn().mockResolvedValue({ ok: true, datos: 'y' })

    const a = renderHook(() => useConsultaCacheada(`${prefijo}a`, consultar))
    const b = renderHook(() => useConsultaCacheada(`${prefijo}b`, consultar))
    await waitFor(() => expect(a.result.current.datos).toBe('y'))
    await waitFor(() => expect(b.result.current.datos).toBe('y'))
    a.unmount()
    b.unmount()

    invalidarCacheConPrefijo(prefijo)

    const otra = renderHook(() => useConsultaCacheada(`${prefijo}a`, consultar))
    expect(otra.result.current.cargando).toBe(true)
  })
})
