import type { ReactElement } from 'react'
import type { CriteriosDeCatalogo } from '../filtros'
import { BarraDeBusquedaDelCatalogo } from './BarraDeBusquedaDelCatalogo'
import { PopoverDeFiltrosDeCatalogo } from './PopoverDeFiltrosDeCatalogo'

/*
  Misma superficie que `conferencias/components/ControlesDelListado.tsx`:
  una sola barra elevada (`bg-panel`), la búsqueda siempre a la vista y los
  filtros menos frecuentes agrupados detrás de un botón. Sin selector de
  orden: el PRD no lo pide para el catálogo y el volumen del fixture no lo
  necesita — el orden por defecto (`ordenarCatalogo`) ya es estable.
*/

export type PropsControlesDelCatalogo = {
  criterios: CriteriosDeCatalogo
  temasDisponibles: readonly string[]
  eventosDisponibles: readonly string[]
  alCambiar: (parche: Partial<CriteriosDeCatalogo>) => void
}

export function ControlesDelCatalogo({
  criterios,
  temasDisponibles,
  eventosDisponibles,
  alCambiar,
}: PropsControlesDelCatalogo): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-panel p-1.5 shadow-sm">
      <div className="min-w-48 flex-1 basis-48">
        <BarraDeBusquedaDelCatalogo valor={criterios.busqueda} alCambiar={(busqueda) => alCambiar({ busqueda })} />
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-filete" aria-hidden="true" />

      <PopoverDeFiltrosDeCatalogo
        criterios={criterios}
        temasDisponibles={temasDisponibles}
        eventosDisponibles={eventosDisponibles}
        alCambiar={alCambiar}
      />
    </div>
  )
}
