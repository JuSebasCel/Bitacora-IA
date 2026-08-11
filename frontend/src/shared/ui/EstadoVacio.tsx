import type { ReactElement, ReactNode } from 'react'

/*
  Estado vacío de una sección.

  Dice qué falta y por qué, no solo que no hay nada. Un vacío por falta de datos
  y un vacío porque los filtros no dejan pasar nada son situaciones distintas y
  cada una necesita su propio texto y su propia salida; este componente es solo
  el molde.
*/

export type PropsEstadoVacio = {
  titulo: string
  descripcion: string
  /** Salida opcional: cargar la primera conferencia, quitar los filtros. */
  children?: ReactNode
}

export function EstadoVacio({ titulo, descripcion, children }: PropsEstadoVacio): ReactElement {
  return (
    <div className="flex flex-col items-start gap-2 border-t border-filete py-10">
      <p className="text-sm font-medium text-texto">{titulo}</p>
      <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">{descripcion}</p>
      {children === undefined ? null : <div className="mt-2">{children}</div>}
    </div>
  )
}
