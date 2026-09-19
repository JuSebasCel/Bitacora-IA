import { useState } from 'react'
import type { ReactElement } from 'react'

/*
  Selector de vista (lista / grilla), calcado de la referencia.

  Lo importante, y lo que la primera versión tenía mal: **el fondo no cambia**.
  Las dos mitades comparten la misma superficie continua
  (`surface-container`), y lo único que distingue a la opción activa es el
  icono, que hace dos cosas a la vez:

  - pasa de contorno a relleno (`FILL` de 0 a 1, un eje de la fuente variable)
  - sube de gris apagado a máximo contraste (`primary`: negro en claro,
    blanco en oscuro)

  Invertir el fondo de la mitad activa, que fue el primer intento, se ve mucho
  más pesado y rompe la píldora en dos.

  Medidas reales: cada mitad 48×40, con el radio solo en su lado exterior
  (24px) y el padding asimétrico — 16px hacia el borde de la píldora y 8px
  hacia el centro, para que los dos iconos queden ópticamente centrados.
*/

export type OpcionDeVista = {
  valor: string
  /** Nombre del icono en Material Symbols, p. ej. `view_column`. */
  icono: string
  etiqueta: string
}

export type PropsSelectorDeVista = {
  opciones: readonly [OpcionDeVista, OpcionDeVista]
  inicial?: string
}

export function SelectorDeVista({ opciones, inicial }: PropsSelectorDeVista): ReactElement {
  const [vista, setVista] = useState(inicial ?? opciones[0].valor)

  return (
    <div className="inline-flex">
      {opciones.map((opcion, indice) => {
        const esActiva = opcion.valor === vista
        const esPrimera = indice === 0

        return (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setVista(opcion.valor)}
            aria-pressed={esActiva}
            aria-label={opcion.etiqueta}
            className={`flex h-10 w-12 cursor-pointer items-center justify-center bg-[var(--m3-surface-container)] text-2xl ${
              esPrimera ? 'rounded-l-3xl pr-2 pl-4' : 'rounded-r-3xl pr-4 pl-2'
            }`}
          >
            {/*
              `[color:var(...)]` y no `text-[var(...)]`: con una variable
              suelta, Tailwind no puede saber si le pides color o tamaño de
              letra, y aquí resolvía a tamaño — el icono terminaba heredando
              el color del padre en vez de tomar el del token.
            */}
            <span
              aria-hidden="true"
              className={`material-symbols-rounded icono-de-vista ${
                esActiva
                  ? 'icono-relleno [color:var(--m3-primary)]'
                  : 'icono-contorno [color:var(--m3-on-surface-variant)]'
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
