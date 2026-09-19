import type { ReactElement } from 'react'

/*
  Selector de vista, calcado de la referencia.

  Lo que lo define: **el fondo no cambia**. Las dos mitades comparten una sola
  superficie continua, y lo único que distingue a la activa es el icono, que
  hace dos cosas a la vez — pasa de contorno a relleno (`FILL` de 0 a 1, un
  eje de la fuente variable) y sube a máximo contraste.

  Invertir el fondo de la mitad activa parte la píldora en dos y se ve mucho
  más pesado. El relleno morfa en vez de saltar gracias a `.icono-de-vista`
  (`styles/index.css`); la referencia no lo anima, eso es añadido nuestro.

  Cada mitad mide 48×40, con el radio solo en su lado exterior y el padding
  asimétrico —16px hacia el borde, 8px hacia el centro— para que los dos
  iconos queden ópticamente centrados.
*/

export type OpcionDeVista<T extends string> = {
  valor: T
  /** Nombre del icono en Material Symbols, p. ej. `view_column`. */
  icono: string
  etiqueta: string
}

export type PropsSelectorDeVista<T extends string> = {
  opciones: readonly [OpcionDeVista<T>, OpcionDeVista<T>]
  valor: T
  alCambiar: (valor: T) => void
}

export function SelectorDeVista<T extends string>({
  opciones,
  valor,
  alCambiar,
}: PropsSelectorDeVista<T>): ReactElement {
  return (
    <div className="inline-flex shrink-0">
      {opciones.map((opcion, indice) => {
        const activa = opcion.valor === valor

        return (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => alCambiar(opcion.valor)}
            aria-pressed={activa}
            aria-label={opcion.etiqueta}
            className={`flex h-10 w-12 cursor-pointer items-center justify-center bg-acento-tenue text-2xl ${
              indice === 0 ? 'rounded-l-full pr-2 pl-4' : 'rounded-r-full pr-4 pl-2'
            }`}
          >
            {/*
              `[color:var(...)]` y no `text-…`: con una variable suelta,
              Tailwind no puede saber si le pides color o tamaño de letra, y
              resolvía a tamaño — el icono heredaba el color del padre.
            */}
            <span
              aria-hidden="true"
              className={`material-symbols-rounded icono-de-vista ${
                activa
                  ? 'icono-relleno [color:var(--bitacora-acento)]'
                  : 'icono-contorno [color:var(--bitacora-texto-tenue)]'
              }`}
            >
              {opcion.icono}
            </span>
          </button>
        )
      })}
    </div>
  )
}
