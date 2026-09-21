import type { ReactElement } from 'react'

/*
  Elegir una entre pocas opciones, a la vista: el "pretty choice" de la app de
  referencia (sus filtros de tareas), medido allí.

      grupo        flex con salto de línea, 4px entre pastillas
      pastilla     40px de alto, radio 24, 14px/500, icono de 14px
                   reparten el ancho de su fila (`flex: 1 1 0`) y saltan a
                   la siguiente cuando su texto no cabe
      sin elegir   superficie tenue, texto tenue, 12px de relleno lateral
      elegida      negro sobre claro (el acento), 24px de relleno lateral

  **La firma es que la elegida crece.** El relleno pasa de 12 a 24px con una
  curva que se pasa del destino y vuelve (`cubic-bezier(0.38, 0.49, 0, 2)`),
  y como la fila reparte el ancho, la elegida empuja a sus vecinas: se ve la
  pastilla inflarse. Es el mismo recurso del dock y del calendario —en esta
  casa la selección se dice agrandando—. Las cuatro transiciones van en
  `.opcion-en-pastilla` (`styles/index.css`) porque tienen duraciones y
  curvas distintas.

  Sustituye al segmentado con una pieza que se desliza: con más de tres
  opciones el carril se volvía una cinta estrecha, y las etiquetas largas
  quedaban cortadas.
*/
export type OpcionEnPastilla<T extends string> = {
  readonly valor: T
  readonly etiqueta: string
  /** Ligadura de Material Symbols, opcional. */
  readonly icono?: string
}

export type PropsEleccionEnPastillas<T extends string> = {
  opciones: readonly OpcionEnPastilla<T>[]
  valor: T
  alCambiar: (valor: T) => void
  /** Rótulo pequeño encima del grupo, como en la referencia. */
  etiqueta?: string
}

export function EleccionEnPastillas<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: PropsEleccionEnPastillas<T>): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      {etiqueta === undefined ? null : <p className="px-1 text-xs text-texto-tenue">{etiqueta}</p>}

      <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-1">
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor

          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={elegida}
              onClick={() => alCambiar(opcion.valor)}
              className={`opcion-en-pastilla flex h-10 flex-1 basis-0 cursor-pointer items-center justify-center gap-1 rounded-3xl text-sm font-medium whitespace-nowrap ${
                elegida ? 'bg-acento px-6 text-acento-contraste' : 'bg-acento-tenue px-3 text-texto-tenue hover:text-texto'
              }`}
            >
              {opcion.icono === undefined ? null : (
                <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-[14px]">
                  {opcion.icono}
                </span>
              )}
              {opcion.etiqueta}
            </button>
          )
        })}
      </div>
    </div>
  )
}
