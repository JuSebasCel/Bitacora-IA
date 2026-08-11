import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import type { Etiqueta } from '../data'

/*
  Chips de etiquetas seleccionables, dentro del panel de filtros. Crear una
  etiqueta ya no es un campo de texto siempre a la vista: es un chip con "+"
  que abre el diálogo `CreadorDeEtiqueta`, para que el filtro no dedique la
  mitad de su espacio a una acción que se usa pocas veces.
*/

type PropiedadesFiltro = {
  etiquetas: readonly Etiqueta[]
  seleccionadas: readonly string[]
  alAlternar: (idEtiqueta: string) => void
  alAbrirCreador: () => void
}

export function FiltroDeEtiquetas({
  etiquetas,
  seleccionadas,
  alAlternar,
  alAbrirCreador,
}: PropiedadesFiltro) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-texto-tenue">Etiquetas</legend>

      {etiquetas.length === 0 ? (
        <p className="text-xs text-texto-tenue">
          Todavía no tienes etiquetas. Crea una para agrupar conferencias a tu manera.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {etiquetas.map((etiqueta) => {
          const marcada = seleccionadas.includes(etiqueta.id)

          return (
            <label
              key={etiqueta.id}
              className={`relative cursor-pointer rounded-md px-2 py-1 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                marcada
                  ? 'bg-acento-tenue font-medium text-acento'
                  : 'bg-fondo text-texto-tenue hover:text-texto'
              }`}
            >
              <input
                type="checkbox"
                checked={marcada}
                onChange={() => alAlternar(etiqueta.id)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              {etiqueta.nombre}
            </label>
          )
        })}

        <button
          type="button"
          onClick={alAbrirCreador}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-texto-tenue transition-colors hover:bg-fondo hover:text-acento"
        >
          <PlusIcon size={12} weight="bold" aria-hidden="true" />
          Nueva etiqueta
        </button>
      </div>
    </fieldset>
  )
}
