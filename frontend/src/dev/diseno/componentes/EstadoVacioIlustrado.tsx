import type { ReactElement } from 'react'
import { M3_TEXTO } from '../paleta'

/*
  Estado vacío de la referencia: un icono grande dentro de un disco, y una
  sola frase debajo. Medidas reales:

  - Disco de 112px con `secondary-container`, icono de 64px con
    `on-secondary-container`, en su variante **rellena**. Ese par de Material
    es lo que hace que la ilustración funcione en los dos temas sin tocarla:
    en oscuro da un gris azulado profundo, y en claro un lavanda muy claro.
  - Frase en la tipografía de títulos, 24px / peso 500.

  El icono es texto, no un SVG: `Material Symbols Rounded` dibuja la ligadura
  a partir del nombre (`folder_open`, `description`, …). De ahí que el tamaño
  se controle con `font-size`. La lista de nombres está en
  fonts.google.com/icons.

  `aria-hidden` en el icono es deliberado: sin eso, un lector de pantalla
  leería literalmente "folder_open". Lo que hay que anunciar es la frase.
*/

export type PropsEstadoVacioIlustrado = {
  /** Nombre del icono en Material Symbols, p. ej. `folder_open`. */
  icono: string
  mensaje: string
}

export function EstadoVacioIlustrado({ icono, mensaje }: PropsEstadoVacioIlustrado): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      {/* El tamaño del icono se declara aquí, en el contenedor: `.icono-relleno` lo hereda. */}
      <span className="flex size-28 items-center justify-center rounded-full bg-[var(--m3-secondary-container)] text-[64px]">
        <span
          aria-hidden="true"
          className="material-symbols-rounded icono-relleno text-[var(--m3-on-secondary-container)]"
        >
          {icono}
        </span>
      </span>

      <p className={`font-titulo text-center text-2xl font-medium ${M3_TEXTO}`}>{mensaje}</p>
    </div>
  )
}
