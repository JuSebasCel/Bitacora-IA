import type { ReactElement, ReactNode } from 'react'

/*
  Estado vacío con ilustración, calcado de la app de referencia: un disco de
  112px con un icono de 64px dentro, y una sola frase debajo en la tipografía
  de títulos.

  Reemplaza al bloque de texto suelto cuando el vacío es la pantalla entera.
  `EstadoVacio` (el de solo texto) sigue sirviendo para vacíos dentro de una
  sección, donde un disco de 112px sería desproporcionado.

  El icono es texto, no un SVG: `Material Symbols Rounded` dibuja la ligadura
  a partir del nombre (`folder_open`, `description`, …), así que el tamaño se
  declara en el contenedor y `.icono-relleno` lo hereda. Los nombres están en
  fonts.google.com/icons.

  `aria-hidden` en el icono es deliberado: sin eso, un lector de pantalla
  leería literalmente "folder_open". Lo que hay que anunciar es la frase.
*/

export type PropsEstadoVacioIlustrado = {
  /** Nombre del icono en Material Symbols. */
  icono: string
  mensaje: string
  /** Salida opcional: la acción que resuelve el vacío. */
  children?: ReactNode
}

export function EstadoVacioIlustrado({ icono, mensaje, children }: PropsEstadoVacioIlustrado): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <span className="flex size-28 items-center justify-center rounded-full bg-ilustracion text-[64px]">
        <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-ilustracion-texto">
          {icono}
        </span>
      </span>

      <p className="font-titulo max-w-prose text-center text-2xl font-medium text-texto">{mensaje}</p>

      {children}
    </div>
  )
}
