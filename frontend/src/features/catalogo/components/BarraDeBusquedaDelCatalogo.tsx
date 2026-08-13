import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement } from 'react'

/*
  Misma forma que `conferencias/components/BarraDeBusqueda.tsx` (lupa
  integrada, sin bloque etiqueta+campo apilado), con su propio texto: aquí se
  busca sobre fragmento y tema de una ficha, no sobre título/ponente/evento
  de una conferencia. El texto vive fijo en el componente (no en F2), así que
  se construye aparte en vez de agregarle una prop al de F2 para un solo uso.
*/

export type PropsBarraDeBusquedaDelCatalogo = {
  valor: string
  alCambiar: (busqueda: string) => void
}

export function BarraDeBusquedaDelCatalogo({ valor, alCambiar }: PropsBarraDeBusquedaDelCatalogo): ReactElement {
  return (
    <div className="relative">
      <label htmlFor="catalogo-buscar" className="sr-only">
        Buscar por fragmento o tema
      </label>

      <MagnifyingGlassIcon
        size={16}
        weight="regular"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-tenue"
      />

      <input
        id="catalogo-buscar"
        type="search"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder="Buscar por fragmento o tema"
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
