import type { ReactElement } from 'react'

/*
  Encabezado común de las pantallas del shell: nombre de la sección y una línea
  que dice, en términos del producto, qué trabajo se hace ahí.

  Salió de `PantallaDeModulo` cuando F2 sustituyó el marcador de posición de
  `/conferencias` por la pantalla real: las dos necesitan exactamente el mismo
  encabezado, y tenerlo en dos sitios habría dejado que se separaran.
*/

export type PropsEncabezadoDeSeccion = {
  titulo: string
  descripcion: string
}

export function EncabezadoDeSeccion({
  titulo,
  descripcion,
}: PropsEncabezadoDeSeccion): ReactElement {
  return (
    <section className="border-t border-filete-fuerte pt-5">
      <h1 className="text-base font-medium tracking-tight text-texto">{titulo}</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-texto-tenue">{descripcion}</p>
    </section>
  )
}
