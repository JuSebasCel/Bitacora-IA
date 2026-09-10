import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { conferenciasVisibles, fichasDelCatalogo } from '@/features/conferencias/query'
import { sembrarConferencias } from '@/test/conferenciasDePrueba'
import { useCatalogo } from './useCatalogo'

vi.mock('@/shared/supabase/cliente')
vi.mock('@/features/conferencias/repositorio')

const ALCANTARA = '1ba5af9a-f6a2-4504-ab60-1f018c21290a'

function totalVisibleDe(idUsuario: string): number {
  return fichasDelCatalogo(FICHAS_DE_EJEMPLO, conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario)).length
}

function envolver(rutaInicial = '/catalogo') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[rutaInicial]}>{children}</MemoryRouter>
  }
}

beforeEach(() => {
  sembrarConferencias()
})

/*
  El catálogo ahora trae sus fichas de Supabase (B5), así que la primera
  respuesta del hook es siempre "cargando". Cada caso espera a que resuelva
  antes de comprobar el comportamiento que le interesa; la data sembrada es la
  misma de ejemplo de siempre, por la nueva puerta.
*/
async function catalogoListo(rutaInicial?: string) {
  const render = renderHook(() => useCatalogo(ALCANTARA), { wrapper: envolver(rutaInicial) })
  await waitFor(() => expect(render.result.current.carga).toBe('listo'))
  return render
}

describe('useCatalogo', () => {
  it('arranca con todas las entradas visibles para esa cuenta', async () => {
    const { result } = await catalogoListo()

    expect(result.current.entradas).toHaveLength(totalVisibleDe(ALCANTARA))
    expect(result.current.criterios.idTema).toBeNull()
  })

  it('alCambiar filtra por tema y lo refleja en el estado', async () => {
    const { result } = await catalogoListo()
    const [primeraEntrada] = result.current.entradas
    if (primeraEntrada === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    act(() => {
      result.current.alCambiar({ idTema: primeraEntrada.ficha.idTema })
    })

    expect(result.current.criterios.idTema).toBe(primeraEntrada.ficha.idTema)
    expect(
      result.current.entradas.every((entrada) => entrada.ficha.idTema === primeraEntrada.ficha.idTema),
    ).toBe(true)
  })

  it('alCambiar aplica sobre los criterios actuales, sin perder los anteriores', async () => {
    const { result } = await catalogoListo()

    act(() => {
      result.current.alCambiar({ estado: 'validada' })
    })
    act(() => {
      result.current.alCambiar({ tipoDeUnidad: 'cita-textual' })
    })

    expect(result.current.criterios.estado).toBe('validada')
    expect(result.current.criterios.tipoDeUnidad).toBe('cita-textual')
  })

  it('alQuitarFiltros vuelve a mostrar todas las entradas visibles', async () => {
    const { result } = await catalogoListo()

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

  it('temasDisponibles y eventosDisponibles solo traen lo visible para esa cuenta', async () => {
    const { result } = await catalogoListo()

    for (const tema of result.current.temasDisponibles) {
      expect(result.current.entradas.some((entrada) => entrada.ficha.idTema === tema.id)).toBe(true)
    }
  })

  it('lee los criterios iniciales desde la URL', async () => {
    const { result } = await catalogoListo('/catalogo?estado=validada')

    expect(result.current.criterios.estado).toBe('validada')
  })

  /*
    El hook descartaba el `carga` de `useConferenciasVisibles`, así que la
    pantalla no tenía forma de distinguir "todavía cargando" de "ya se sabe
    que no hay nada" y podía pintar el vacío equivocado en el primer render.
  */
  it('expone el estado de carga de las conferencias visibles', async () => {
    const { result } = await catalogoListo()

    expect(result.current.carga).toBe('listo')
  })
})
