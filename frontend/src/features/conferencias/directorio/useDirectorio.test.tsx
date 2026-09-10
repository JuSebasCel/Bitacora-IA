import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockearFilaDe, mockearTabla, reiniciarMocksDeDatos } from '@/test/supabaseDePrueba'
import { useDirectorio } from './useDirectorio'

vi.mock('@/shared/supabase/cliente')

beforeEach(() => {
  reiniciarMocksDeDatos()
  mockearTabla('eventos', [{ id: 'evt-1', nombre: 'Simposio Andino' }])
  mockearTabla('ponentes', [{ id: 'pon-1', nombre: 'Mariana Escobar', id_evento: 'evt-1' }])
})

afterEach(() => {
  vi.clearAllMocks()
})

async function directorioListo() {
  const render = renderHook(() => useDirectorio())
  await waitFor(() => expect(render.result.current.cargando).toBe(false))
  return render
}

describe('useDirectorio', () => {
  it('carga eventos y ponentes de Supabase', async () => {
    const { result } = await directorioListo()

    expect(result.current.eventos.map((e) => e.nombre)).toEqual(['Simposio Andino'])
    expect(result.current.ponentes[0]?.idEvento).toBe('evt-1')
  })

  it('rechaza un evento con nombre repetido sin escribir', async () => {
    const { result } = await directorioListo()

    const resultado = await result.current.crearEvento('simposio andino')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.codigo).toBe('DIR_EVENTO_YA_EXISTE')
  })

  it('crea un evento nuevo y lo deja disponible', async () => {
    const { result } = await directorioListo()
    mockearFilaDe('eventos', { id: 'evt-2', nombre: 'Coloquio del Norte' })

    const resultado = await result.current.crearEvento('Coloquio del Norte')

    expect(resultado.ok).toBe(true)
    await waitFor(() =>
      expect(result.current.eventos.some((e) => e.nombre === 'Coloquio del Norte')).toBe(true),
    )
  })

  it('crea un ponente dentro de un evento', async () => {
    const { result } = await directorioListo()
    mockearFilaDe('ponentes', { id: 'pon-2', nombre: 'Rodrigo Peñaloza', id_evento: 'evt-1' })

    const resultado = await result.current.crearPonente('evt-1', 'Rodrigo Peñaloza')

    expect(resultado.ok).toBe(true)
    await waitFor(() =>
      expect(result.current.ponentes.some((p) => p.nombre === 'Rodrigo Peñaloza')).toBe(true),
    )
  })
})
