import type { ReactElement } from 'react'

/*
  Marca de posición mientras llegan los datos.

  Tiene la forma de lo que va a aparecer, no una genérica: el esqueleto de
  una galería es una rejilla de hojas y el del archivo, sus columnas. Si el
  hueco que se dibuja no se parece a lo que llega, la pantalla salta al
  cargar, y ese salto es justo lo que un esqueleto existe para evitar.

  Las superficies son las de la app —radios de 24 y 16, `panel` sobre
  `fondo`— y el movimiento es el barrido de luz que ya recorre una conferencia
  mientras se analiza (`.barrido-de-carga`): "algo se está preparando" se
  dice igual en toda la app. El esqueleto anterior eran renglones grises
  separados por filetes, del diseño de antes.

  Se anuncia como `status` y lleva un texto para lector de pantalla: una
  animación no comunica nada a quien no la ve. La hoja global ya detiene el
  barrido bajo `prefers-reduced-motion`.
*/

export type PropsEsqueleto = {
  /** Cuántos elementos dibujar. Debe parecerse al contenido que va a sustituir. */
  filas?: number
  etiqueta?: string
  /** La forma de lo que va a llegar. */
  variante?: 'lista' | 'columnas' | 'galeria'
}

const BARRIDO = 'barrido-de-carga relative overflow-hidden'

function Barra({ ancho }: { ancho: string }): ReactElement {
  return <div className={`h-3 rounded-full bg-acento-tenue ${ancho}`} />
}

function Fila(): ReactElement {
  return (
    <div className={`${BARRIDO} flex items-center gap-4 rounded-2xl bg-panel px-5 py-4`}>
      <div className="size-9 shrink-0 rounded-full bg-acento-tenue" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Barra ancho="w-2/3" />
        <Barra ancho="w-1/3" />
      </div>
    </div>
  )
}

export function Esqueleto({ filas = 3, etiqueta = 'Cargando', variante = 'lista' }: PropsEsqueleto): ReactElement {
  const elementos = Array.from({ length: filas }, (_, indice) => indice)

  if (variante === 'galeria') {
    return (
      <div role="status" aria-label={etiqueta} className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4">
        {elementos.map((indice) => (
          <div key={indice} className={`${BARRIDO} flex flex-col gap-3 rounded-[24px] bg-panel p-3`}>
            <div className="h-56 rounded-2xl bg-acento-tenue" />
            <div className="flex flex-col gap-2 px-2 pb-1">
              <Barra ancho="w-3/4" />
              <Barra ancho="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variante === 'columnas') {
    /* Los anchos del explorador de conferencias: eventos, conferencias y el detalle que ocupa el resto. */
    return (
      <div role="status" aria-label={etiqueta} className="flex min-h-0 flex-1 gap-2">
        {['w-[304px]', 'w-[368px]'].map((ancho) => (
          <div key={ancho} className={`${BARRIDO} hidden flex-col gap-3 rounded-[24px] bg-panel p-6 md:flex ${ancho}`}>
            {elementos.map((indice) => (
              <div key={indice} className="flex items-start gap-3 px-2 py-1">
                <div className="size-5 shrink-0 rounded-full bg-acento-tenue" />
                <div className="flex flex-1 flex-col gap-2">
                  <Barra ancho="w-4/5" />
                  <Barra ancho="w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className={`${BARRIDO} min-h-[24rem] flex-1 rounded-[24px] bg-fondo shadow-[inset_0_0_0_1px_var(--bitacora-filete)]`} />
      </div>
    )
  }

  return (
    <div role="status" aria-label={etiqueta} className="flex flex-col gap-2">
      {elementos.map((indice) => (
        <Fila key={indice} />
      ))}
    </div>
  )
}
