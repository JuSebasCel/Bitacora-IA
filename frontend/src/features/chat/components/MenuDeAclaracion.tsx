import type { ReactElement } from 'react'
import type { AlcanceDeConsulta, MensajeDeAclaracion } from '../data/tipos'

export type PropsMenuDeAclaracion = {
  mensaje: MensajeDeAclaracion
  alElegir: (alcance: AlcanceDeConsulta) => void
}

/*
  Cuando la pregunta es ambigua, el chat no adivina: ofrece opciones
  concretas de alcance (`OpcionDeAclaracion`), cada una ya resuelta a un
  `AlcanceDeConsulta` completo. Elegir una reemplaza el alcance entero, no
  lo parcha (ver el comentario en `data/tipos.ts`).
*/
export function MenuDeAclaracion({ mensaje, alElegir }: PropsMenuDeAclaracion): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-texto">{mensaje.pregunta}</p>

      <div className="flex flex-wrap gap-1.5">
        {mensaje.opciones.map((opcion) => (
          <button
            key={opcion.etiqueta}
            type="button"
            onClick={() => alElegir(opcion.alcance)}
            className="rounded-md bg-fondo px-2.5 py-1 text-xs text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>
    </div>
  )
}
