import type { ReactElement, ReactNode } from 'react'
import { M3_FILETE, M3_PANEL, M3_RADIO_TARJETA, M3_TEXTO, M3_TEXTO_TENUE } from './paleta'

/*
  Dos variantes, las dos con radio 24px y padding 24px (medidos):

  - "Contorno": sin fondo. Lo único que la separa del lienzo es un filete de
    1px que en oscuro cae en #202022 — casi invisible, deliberadamente.
  - "Rellena": fondo `surface-container-low` y ningún filete.

  La referencia alterna las dos sin una regla evidente; funcionan como dos
  pesos visuales, no como dos significados distintos.
*/

export function TarjetaContorno({ titulo, children }: { titulo: string; children?: ReactNode }): ReactElement {
  return (
    <div className={`${M3_RADIO_TARJETA} ${M3_FILETE} flex flex-col gap-3 p-6`}>
      <h3 className={`font-titulo text-2xl font-medium ${M3_TEXTO}`}>{titulo}</h3>
      {children}
    </div>
  )
}

export function TarjetaRellena({ titulo, children }: { titulo: string; children?: ReactNode }): ReactElement {
  return (
    <div className={`${M3_RADIO_TARJETA} ${M3_PANEL} flex flex-col gap-3 p-6`}>
      <h3 className={`font-titulo text-2xl font-medium ${M3_TEXTO}`}>{titulo}</h3>
      {children}
    </div>
  )
}

/*
  La "Nota rápida" de la pantalla de inicio de la referencia: 36px con peso
  600 en la tipografía de títulos. Es el tamaño más grande de esa pantalla, y
  el contraste contra el placeholder en gris es todo lo que la sostiene.
*/
export function TarjetaNotaRapida(): ReactElement {
  return (
    <div className={`${M3_RADIO_TARJETA} ${M3_PANEL} flex min-h-48 flex-col gap-3 p-6`}>
      <h3 className={`font-titulo text-4xl font-semibold ${M3_TEXTO}`}>Nota rápida</h3>
      <p className={`text-lg ${M3_TEXTO_TENUE}`}>Escribe tu nota aquí…</p>
    </div>
  )
}
