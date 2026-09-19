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

      {/*
        Píldora del sistema: 40px de alto sobre `acento-tenue`, la misma
        superficie y el mismo alto que los botones de su renglón, para que la
        fila de controles se lea como una sola pieza.
      */}
      <span
        aria-hidden="true"
        className="material-symbols-rounded icono-contorno pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg text-texto-tenue"
      >
        search
      </span>

      <input
        id="memorias-buscar"
        type="search"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder="Buscar por memoria, conferencia o plantilla"
        className="block h-10 w-full rounded-full bg-acento-tenue pr-11 pl-11 text-base text-texto transition-colors placeholder:text-texto-tenue focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />

      {valor.length === 0 ? null : (
        <button
          type="button"
          onClick={() => alCambiar('')}
          aria-label="Borrar la búsqueda"
          className="absolute top-1/2 right-3 -translate-y-1/2 flex size-6 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:text-texto"
        >
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
            close
          </span>
        </button>
      )}
    </div>
  )
}
