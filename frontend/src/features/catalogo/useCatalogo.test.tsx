import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { conferenciasVisibles, fichasDelCatalogo } from '@/features/conferencias/query'
import { useCatalogo } from './useCatalogo'

const ALCANTARA = 'usr-alcantara'

function totalVisibleDe(idUsuario: string): number {
  return fichasDelCatalogo(FICHAS_DE_EJEMPLO, conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario)).length
}

function envolver(rutaInicial = '/catalogo') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>
  }
}

describe('useCatalogo', () => {
  it('arranca con todas las entradas visibles para esa cuenta', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver() })

    expect(result.current.entradas).toHaveLength(totalVisibleDe(ALCANTARA))
    expect(result.current.criterios.tema).toBeNull()
  })

  it('alCambiar filtra por tema y lo refleja en el estado', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver() })
    const [primeraEntrada] = result.current.entradas
    if (primeraEntrada === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    act(() => {
      result.current.alCambiar({ tema: primeraEntrada.ficha.tema })
    })

    expect(result.current.criterios.tema).toBe(primeraEntrada.ficha.tema)
    expect(result.current.entradas.every((entrada) => entrada.ficha.tema === primeraEntrada.ficha.tema)).toBe(true)
  })

  it('alCambiar aplica sobre los criterios actuales, sin perder los anteriores', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver() })

    act(() => {
      result.current.alCambiar({ estado: 'validada' })
    })
    act(() => {
      result.current.alCambiar({ tipoDeUnidad: 'cita-textual' })
    })

    expect(result.current.criterios.estado).toBe('validada')
    expect(result.current.criterios.tipoDeUnidad).toBe('cita-textual')
  })

  it('alQuitarFiltros vuelve a mostrar todas las entradas visibles', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver() })

    act(() => {
      result.current.alCambiar({ estado: 'validada', tipoDeUnidad: 'cita-textual' })
    })
    act(() => {
      result.current.alQuitarFiltros()
    })

    expect(result.current.criterios.estado).toBe('todos')
    expect(result.current.criterios.tipoDeUnidad).toBeNull()
    expect(result.current.entradas).toHaveLength(totalVisibleDe(ALCANTARA))
  })

  it('temasDisponibles y eventosDisponibles solo traen lo visible para esa cuenta', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver() })

    for (const tema of result.current.temasDisponibles) {
      expect(result.current.entradas.some((entrada) => entrada.ficha.tema === tema)).toBe(true)
    }
  })

  it('lee los criterios iniciales desde la URL', () => {
    const { result } = renderHook(() => useCatalogo(ALCANTARA), {
      wrapper: envolver('/catalogo?estado=validada'),
    })

    expect(result.current.criterios.estado).toBe('validada')
  })
})
