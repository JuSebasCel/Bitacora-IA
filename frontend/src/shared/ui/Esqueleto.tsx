import type { ReactElement } from 'react'

/*
  Marca de posición mientras llegan los datos.

  Se anuncia como `status` y lleva un texto para lector de pantalla: una
  animación gris no comunica nada a quien no la ve, y quedarse en silencio
  durante la carga es peor que decir que se está cargando.

  La hoja global ya neutraliza `animate-pulse` bajo `prefers-reduced-motion`,
  así que aquí no hace falta repetir esa condición.
*/

export type PropsEsqueleto = {
  /** Cuántas líneas dibujar. Debe parecerse al contenido que va a sustituir. */
  filas?: number
  etiqueta?: string
}

export function Esqueleto({ filas = 3, etiqueta = 'Cargando' }: PropsEsqueleto): ReactElement {
  return (
    <div role="status" aria-label={etiqueta} className="flex flex-col divide-y divide-filete">
      {Array.from({ length: filas }, (_, indice) => (
        <div key={indice} className="flex animate-pulse gap-4 py-4">
          <div className="h-3 w-24 shrink-0 rounded-md bg-filete" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3 w-3/4 rounded-md bg-filete" />
            <div className="h-3 w-1/3 rounded-md bg-filete" />
          </div>
        </div>
      ))}
    </div>
  )
}
