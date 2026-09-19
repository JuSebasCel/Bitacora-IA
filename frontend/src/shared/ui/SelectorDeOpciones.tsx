import type { ReactElement } from 'react'
import { Popover } from './Popover'

/*
  Elegir entre pocas opciones, calcado de los controles "Estado" y "Tablero"
  de la app de referencia. Allí es el mismo componente dos veces: uno agrupa
  las tareas y el otro cambia la vista.

  **El botón no tiene rótulo: el botón ES el valor.** Cerrado dice
  "Pendiente", no "Estado: Pendiente"; al abrirse, la opción elegida aparece
  resaltada dentro de la lista, en el sitio donde estaba el botón, y las demás
  salen alrededor. Por eso no hace falta una etiqueta encima explicando de qué
  va: la respuesta ya está a la vista, y el nombre del campo solo haría falta
  si no lo estuviera.

  Medidas de la referencia: lista en columna con 4px de separación, opción de
  48px de alto, 16px de padding y radio 24; la elegida baja a radio 16, salvo
  si es la primera o la última, que vuelven a 24 para que el bloque conserve
  la forma de pastilla por fuera.
*/

export type OpcionDeSelector<T extends string> = {
  readonly valor: T
  readonly etiqueta: string
  /** Ligadura de Material Symbols, opcional. */
  readonly icono?: string
}

export type PropsSelectorDeOpciones<T extends string> = {
  opciones: readonly OpcionDeSelector<T>[]
  valor: T
  alCambiar: (siguiente: T) => void
  /** Para lectores de pantalla: qué se está eligiendo, ya que el botón solo muestra el valor. */
  etiquetaAccesible: string
  /** Qué decir cuando el valor actual no está entre las opciones (todavía sin elegir). */
  vacio?: string
  icono?: string
  alinear?: 'izquierda' | 'derecha'
  deshabilitado?: boolean
}

export function SelectorDeOpciones<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiquetaAccesible,
  vacio = 'Elegir',
  icono,
  alinear = 'izquierda',
  deshabilitado = false,
}: PropsSelectorDeOpciones<T>): ReactElement {
  const elegida = opciones.find((opcion) => opcion.valor === valor)

  if (deshabilitado) {
    return (
      <span className="flex h-11 items-center gap-2 rounded-full bg-acento-tenue px-4 text-base text-texto-tenue opacity-50">
        {icono === undefined ? null : (
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
            {icono}
          </span>
        )}
        {vacio}
      </span>
    )
  }

  return (
    <Popover
      alinear={alinear}
      etiquetaAccesible={`${etiquetaAccesible}: ${elegida?.etiqueta ?? vacio}`}
      className="min-w-0"
      boton={
        <span className="flex h-11 min-w-0 items-center gap-2 rounded-full bg-acento-tenue px-4 text-base text-texto transition-colors hover:bg-ilustracion">
          {icono === undefined ? null : (
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg">
              {icono}
            </span>
          )}
          <span className="truncate">{elegida?.etiqueta ?? vacio}</span>
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg opacity-60">
            expand_more
          </span>
        </span>
      }
    >
      {(cerrar) => (
        <div className="flex max-h-[min(360px,50vh)] w-56 flex-col gap-1 overflow-y-auto">
          {opciones.map((opcion, indice) => {
            const activa = opcion.valor === valor
            const enUnExtremo = indice === 0 || indice === opciones.length - 1

            return (
              <button
                key={opcion.valor}
                type="button"
                aria-pressed={activa}
                onClick={() => {
                  alCambiar(opcion.valor)
                  cerrar()
                }}
                className={`flex h-12 shrink-0 cursor-pointer items-center gap-2 px-4 text-left text-sm transition-colors ${
                  activa
                    ? `bg-ilustracion text-ilustracion-texto ${enUnExtremo ? 'rounded-3xl' : 'rounded-2xl'}`
                    : 'rounded-3xl text-texto-tenue hover:bg-acento-tenue hover:text-texto'
                }`}
              >
                {opcion.icono === undefined ? null : (
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg">
                    {opcion.icono}
                  </span>
                )}
                <span className="truncate">{opcion.etiqueta}</span>
              </button>
            )
          })}
        </div>
      )}
    </Popover>
  )
}
