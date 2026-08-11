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
    <section className="border-t border-filete-fuerte pt-6">
      <h1 className="text-2xl font-semibold tracking-tight text-texto sm:text-3xl">{titulo}</h1>
      <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-texto-tenue">{descripcion}</p>
    </section>
  )
}
