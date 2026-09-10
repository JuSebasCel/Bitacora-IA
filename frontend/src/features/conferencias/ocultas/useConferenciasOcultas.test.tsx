import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/shared/supabase/cliente'
import { mockearTabla, reiniciarMocksDeDatos } from '@/test/supabaseDePrueba'
import { useConferenciasOcultas } from './useConferenciasOcultas'

vi.mock('@/shared/supabase/cliente')

const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'

beforeEach(() => {
  reiniciarMocksDeDatos()
  mockearTabla('conferencias_ocultas', [{ id_conferencia: 'cnf-zul-05' }])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useConferenciasOcultas', () => {
  it('carga las que esta persona ya tenía ocultas', async () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))

    await waitFor(() => expect(result.current.idsOcultos).toEqual(['cnf-zul-05']))
  })

  it('ocultar una conferencia la agrega de inmediato y la escribe', async () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))
    await waitFor(() => expect(result.current.idsOcultos).toEqual(['cnf-zul-05']))

    act(() => result.current.ocultar('cnf-zul-01'))

    expect(result.current.idsOcultos).toContain('cnf-zul-01')
    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('conferencias_ocultas')
  })

  it('mostrar una conferencia la quita de inmediato', async () => {
    const { result } = renderHook(() => useConferenciasOcultas(ZULUAGA))
    await waitFor(() => expect(result.current.idsOcultos).toEqual(['cnf-zul-05']))

    act(() => result.current.mostrar('cnf-zul-05'))

    expect(result.current.idsOcultos).not.toContain('cnf-zul-05')
  })

  it('sin sesión no consulta y queda vacío', async () => {
    const { result } = renderHook(() => useConferenciasOcultas(''))

    await waitFor(() => expect(result.current.idsOcultos).toEqual([]))
  })
})
