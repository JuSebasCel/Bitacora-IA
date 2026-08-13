import { useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import type { EstadoDeCarga } from '@/features/conferencias/components/useConferenciasVisibles'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { CRITERIOS_POR_DEFECTO, eventosDisponibles, listarCatalogo, temasDisponibles } from './filtros'
import type { CriteriosDeCatalogo } from './filtros'
import { escribirCriteriosDeCatalogo, leerCriteriosDeCatalogo } from './parametros'

export type ValorDeCatalogo = {
  readonly carga: EstadoDeCarga
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
  const { carga, visibles } = useConferenciasVisibles(idUsuario)
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
    Los criterios ya aplicados se recuerdan en una referencia, no se releen de
    la URL en cada cambio.

    La forma funcional de `setSearchParams` no basta: su `anteriores` sale del
    estado ya confirmado por React, así que dos clics seguidos antes de que el
    primero termine de renderizar hacían que el segundo partiera de la URL
    vieja y resucitara el filtro que el primero acababa de quitar. Se veía
    eligiendo "Todos los eventos" e inmediatamente un tipo de unidad: el
    evento volvía solo. Con la referencia, el segundo cambio parte siempre de
    lo último pedido, se haya renderizado o no.

    La URL sigue mandando cuando cambia por fuera (botón atrás, enlace
    compartido, "Quitar filtros"): ahí se resincroniza la referencia.
  */
  const consultaActual = searchParams.toString()
  const refCriterios = useRef(criterios)
  const refConsulta = useRef(consultaActual)

  if (refConsulta.current !== consultaActual) {
    refConsulta.current = consultaActual
    refCriterios.current = criterios
  }

  function aplicar(siguientes: CriteriosDeCatalogo): void {
    const params = escribirCriteriosDeCatalogo(siguientes)

    refCriterios.current = siguientes
    refConsulta.current = params.toString()
    setSearchParams(params)
  }

  function alCambiar(parche: Partial<CriteriosDeCatalogo>): void {
    aplicar({ ...refCriterios.current, ...parche })
  }

  function alQuitarFiltros(): void {
    aplicar(CRITERIOS_POR_DEFECTO)
  }

  return {
    carga,
    entradas,
    criterios,
    temasDisponibles: temas,
    eventosDisponibles: eventos,
    alCambiar,
    alQuitarFiltros,
  }
}
