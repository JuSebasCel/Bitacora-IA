import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
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
  /**
   * Si se pasa, el panel trae al final un renglón para crear una opción
   * nueva. Va aquí dentro y no en un diálogo aparte: crear es otra forma de
   * elegir, y abrir una ventana encima de la que ya estaba abierta para
   * escribir una palabra es más ceremonia de la que el gesto pide.
   */
  alCrear?: (nombre: string) => Promise<{ ok: true; valor: T } | { ok: false; mensaje: string }>
  textoDeCreacion?: string
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
  alCrear,
  textoDeCreacion = 'Crear',
}: PropsSelectorDeOpciones<T>): ReactElement {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
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
      claseDelBoton="max-w-full cursor-pointer"
      claseDelPanel="w-56"
      boton={
        <span className="flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full bg-acento-tenue px-4 text-base text-texto transition-colors hover:bg-ilustracion">
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
        <div className="flex flex-col gap-1">
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

          {alCrear === undefined ? null : (
            <form
              onSubmit={(evento: FormEvent<HTMLFormElement>) => {
                evento.preventDefault()
                if (creando || nombre.trim().length === 0) return

                setCreando(true)
                void alCrear(nombre).then((resultado) => {
                  setCreando(false)

                  if (resultado.ok) {
                    setNombre('')
                    setError(null)
                    alCambiar(resultado.valor)
                    cerrar()
                  } else {
                    setError(resultado.mensaje)
                  }
                })
              }}
              className="mt-1 flex flex-col gap-1.5 border-t border-filete pt-2"
            >
              <div className="flex gap-1.5">
                <input
                  value={nombre}
                  onChange={(cambio) => {
                    setNombre(cambio.target.value)
                    setError(null)
                  }}
                  placeholder={textoDeCreacion}
                  aria-label={textoDeCreacion}
                  className="h-10 min-w-0 flex-1 rounded-full bg-acento-tenue px-3 text-sm text-texto placeholder:text-texto-tenue focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={nombre.trim().length === 0 || creando}
                  aria-label={textoDeCreacion}
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-acento text-acento-contraste transition-opacity disabled:cursor-default disabled:opacity-40"
                >
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                    add
                  </span>
                </button>
              </div>

              {error === null ? null : (
                <p role="alert" className="px-3 text-sm text-error">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </Popover>
  )
}
