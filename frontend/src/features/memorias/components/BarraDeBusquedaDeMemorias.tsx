import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement } from 'react'

/*
  Misma forma que `catalogo/components/BarraDeBusquedaDelCatalogo.tsx` (lupa
  integrada, sin bloque etiqueta+campo apilado), con su propio texto: aquí se
  busca sobre el nombre de la memoria, la conferencia y la plantilla de
  origen (ver `filtros.ts`), no sobre fragmento/tema de una ficha.
*/

export type PropsBarraDeBusquedaDeMemorias = {
  valor: string
  alCambiar: (busqueda: string) => void
}

export function BarraDeBusquedaDeMemorias({ valor, alCambiar }: PropsBarraDeBusquedaDeMemorias): ReactElement {
  return (
    <div className="relative">
      <label htmlFor="memorias-buscar" className="sr-only">
        Buscar por memoria, conferencia o plantilla
      </label>

      <MagnifyingGlassIcon
        size={16}
        weight="regular"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-tenue"
      />

      <input
        id="memorias-buscar"
        type="search"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder="Buscar por memoria, conferencia o plantilla"
        className="block w-full rounded-md bg-fondo py-1.5 pr-9 pl-9 text-sm text-texto transition-colors placeholder:text-texto-tenue hover:bg-fondo focus:bg-panel focus:shadow-sm [&::-webkit-search-cancel-button]:hidden"
      />

      {valor.length === 0 ? null : (
        <button
          type="button"
          onClick={() => alCambiar('')}
          aria-label="Borrar la búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
        >
          <XIcon size={12} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
