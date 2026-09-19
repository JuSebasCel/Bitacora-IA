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
    /*
      El título va en la tipografía de títulos y la descripción en la de
      texto: ese contraste entre familias es lo que separa encabezado de
      contenido sin depender solo del tamaño.

      Se fue la línea superior: era chrome que no decía nada. El título ya
      abre la pantalla por sí solo.
    */
    <section>
      <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">{titulo}</h1>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-texto-tenue">{descripcion}</p>
    </section>
  )
}
