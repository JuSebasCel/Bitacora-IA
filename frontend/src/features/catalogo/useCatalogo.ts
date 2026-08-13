import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { CRITERIOS_POR_DEFECTO, eventosDisponibles, listarCatalogo, temasDisponibles } from './filtros'
import type { CriteriosDeCatalogo } from './filtros'
import { escribirCriteriosDeCatalogo, leerCriteriosDeCatalogo } from './parametros'

export type ValorDeCatalogo = {
  readonly entradas: readonly FichaDelCatalogo[]
  readonly criterios: CriteriosDeCatalogo
  readonly temasDisponibles: readonly string[]
  readonly eventosDisponibles: readonly string[]
  readonly alCambiar: (parche: Partial<CriteriosDeCatalogo>) => void
  readonly alQuitarFiltros: () => void
}

/*
  Junta lo que una persona puede ver (`useConferenciasVisibles` + fichas del
  fixture) con los criterios que vienen de la URL, y expone el catálogo ya
  filtrado. Mismo criterio que el dashboard de F2: los filtros viven en la
  URL, así que `alCambiar` reescribe la consulta en vez de guardar estado
  local — una vista filtrada es compartible y sobrevive a un recargado.
*/
export function useCatalogo(idUsuario: string): ValorDeCatalogo {
  const { visibles } = useConferenciasVisibles(idUsuario)
  const [searchParams, setSearchParams] = useSearchParams()

  const todasLasEntradas = useMemo(
    () => fichasDelCatalogo(FICHAS_DE_EJEMPLO, visibles),
    [visibles],
  )

  const temas = useMemo(() => temasDisponibles(todasLasEntradas), [todasLasEntradas])
  const eventos = useMemo(() => eventosDisponibles(todasLasEntradas), [todasLasEntradas])

  const criterios = useMemo(
    () => leerCriteriosDeCatalogo(searchParams, temas, eventos),
    [searchParams, temas, eventos],
  )

  const entradas = useMemo(
    () => listarCatalogo({ entradas: todasLasEntradas, criterios }),
    [todasLasEntradas, criterios],
  )

  /*
    Aplica el parche sobre los criterios que la URL tenga en ese momento
    (`anteriores`), no sobre los del render actual: con la forma directa, dos
    cambios seguidos antes de un re-render se pisaban entre sí — el mismo bug
    que ya tuvo el dashboard de F2 y que ahí se corrigió igual.
  */
  function alCambiar(parche: Partial<CriteriosDeCatalogo>): void {
    setSearchParams((anteriores) =>
      escribirCriteriosDeCatalogo({ ...leerCriteriosDeCatalogo(anteriores, temas, eventos), ...parche }),
    )
  }

  function alQuitarFiltros(): void {
    setSearchParams(escribirCriteriosDeCatalogo(CRITERIOS_POR_DEFECTO))
  }

  return {
    entradas,
    criterios,
    temasDisponibles: temas,
    eventosDisponibles: eventos,
    alCambiar,
    alQuitarFiltros,
  }
}
