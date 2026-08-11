import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'

/*
  Búsqueda del listado, con la lupa integrada en vez del bloque etiqueta +
  campo apilado que se lee como un `<form>` de formulario administrativo. La
  etiqueta sigue existiendo para quien usa lector de pantalla, solo que no se
  dibuja: el icono y el `placeholder` ya comunican qué hace el campo a quien lo
  ve.
*/

type PropiedadesBarraDeBusqueda = {
  valor: string
  alCambiar: (busqueda: string) => void
}

export function BarraDeBusqueda({ valor, alCambiar }: PropiedadesBarraDeBusqueda) {
  return (
    <div className="relative">
      <label htmlFor="buscar" className="sr-only">
        Buscar por conferencia, ponente o evento
      </label>

      <MagnifyingGlassIcon
        size={16}
        weight="regular"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-tenue"
      />

      <input
        id="buscar"
        type="search"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder="Buscar por conferencia, ponente o evento"
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
