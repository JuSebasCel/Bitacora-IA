import { useState } from 'react'
import type { ReactElement } from 'react'
import type { Etiqueta } from '../data'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'

/*
  Etiquetas como pastillas que se marcan y desmarcan, en el lenguaje del
  rediseño.

  La misma pieza sirve para las dos cosas que se hacen con etiquetas, porque
  son la misma interacción sobre distinto conjunto:

      filtrar     marcadas = las etiquetas del filtro
      asignar     marcadas = las que lleva puestas esa conferencia

  Crear va aquí dentro, como un renglón de texto, y no en un diálogo aparte:
  esto vive dentro de un modal anclado, y abrir un segundo modal encima del
  primero para escribir una palabra es más ceremonia de la que el gesto pide.
  El error vuelve en línea, debajo del campo.

  Cada pastilla es una `<input type="checkbox">` de verdad, tapada con
  `appearance-none`: así se marca con la barra espaciadora y se lee como
  casilla, que es lo que es.
*/

export type PropsSelectorDeEtiquetas = {
  etiquetas: readonly Etiqueta[]
  marcadas: readonly string[]
  alAlternar: (idEtiqueta: string) => void
  /** Si se pasa, aparece el renglón para crear una etiqueta nueva. */
  alCrear?: (nombre: string) => ResultadoCreacion | Promise<ResultadoCreacion>
  /** Qué decir cuando todavía no hay ninguna etiqueta. */
  vacio: string
  /** Si se pasa, cada etiqueta trae una ✕ para borrarla del espacio propio. */
  alEliminar?: (idEtiqueta: string) => void
}

const PASTILLA =
  'relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento'

export function SelectorDeEtiquetas({
  etiquetas,
  marcadas,
  alAlternar,
  alCrear,
  vacio,
  alEliminar,
}: PropsSelectorDeEtiquetas): ReactElement {
  const [porBorrar, setPorBorrar] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  /*
    Crear NO va dentro de un `<form>`.

    Este selector se usa dentro del modal de carga, que ya es un formulario, y
    un `<form>` dentro de otro es HTML inválido: el botón acababa disparando
    una submisión nativa que recargaba la aplicación entera y devolvía a la
    pantalla principal. Un campo con su botón y el Enter atado a mano hace lo
    mismo sin depender de dónde se monte.
  */
  async function alEnviar(): Promise<void> {
    if (alCrear === undefined || creando) {
      return
    }

    setCreando(true)
    const resultado = await alCrear(nombre)
    setCreando(false)

    if (resultado.ok) {
      setNombre('')
      setError(null)
    } else {
      setError(resultado.mensaje)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {etiquetas.length === 0 ? <p className="text-sm text-texto-tenue">{vacio}</p> : null}

      {etiquetas.length === 0 ? null : (
        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((etiqueta) => {
            const marcada = marcadas.includes(etiqueta.id)
            const confirmando = porBorrar === etiqueta.id

            /*
              Borrar pide un segundo clic sobre la propia pastilla, que se
              vuelve roja y dice "¿Borrar?". Sin ese paso, una ✕ pequeña
              pegada al nombre se pulsa sin querer al intentar marcarla — y
              con la etiqueta se van todas sus asignaciones, que es lo que
              hace el descuido caro.
            */
            if (confirmando) {
              return (
                <span
                  key={etiqueta.id}
                  className="flex items-center gap-1 rounded-full bg-error px-1 py-0.5 text-sm text-acento-contraste"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPorBorrar(null)
                      void alEliminar?.(etiqueta.id)
                    }}
                    className="cursor-pointer rounded-full px-2 py-0.5"
                  >
                    ¿Borrar «{etiqueta.nombre}»?
                  </button>
                  <button
                    type="button"
                    onClick={() => setPorBorrar(null)}
                    aria-label="Conservar la etiqueta"
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-acento-contraste/20"
                  >
                    <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
                      close
                    </span>
                  </button>
                </span>
              )
            }

            return (
              <span
                key={etiqueta.id}
                className={`group flex items-center rounded-full transition-colors ${
                  marcada ? 'bg-acento text-acento-contraste' : 'bg-acento-tenue text-texto-tenue'
                }`}
              >
                <label className={`${PASTILLA} ${marcada ? '' : 'hover:text-texto'}`}>
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => alAlternar(etiqueta.id)}
                    className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                  />
                  {etiqueta.nombre}
                </label>

                {alEliminar === undefined ? null : (
                  <button
                    type="button"
                    onClick={() => setPorBorrar(etiqueta.id)}
                    aria-label={`Borrar la etiqueta ${etiqueta.nombre}`}
                    /* Aparece al pasar por encima o al enfocar: no ensucia la lista en reposo. */
                    className="mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 focus-visible:opacity-100"
                  >
                    <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
                      close
                    </span>
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {alCrear === undefined ? null : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={(cambio) => {
                setNombre(cambio.target.value)
                setError(null)
              }}
              onKeyDown={(tecla) => {
                if (tecla.key === 'Enter') {
                  tecla.preventDefault()
                  void alEnviar()
                }
              }}
              placeholder="Nueva etiqueta"
              aria-label="Nombre de la etiqueta nueva"
              className="h-10 min-w-0 flex-1 rounded-full bg-acento-tenue px-4 text-sm text-texto placeholder:text-texto-tenue focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void alEnviar()}
              disabled={nombre.trim().length === 0 || creando}
              className="h-10 shrink-0 cursor-pointer rounded-full bg-acento px-4 text-sm font-medium text-acento-contraste transition-opacity disabled:cursor-default disabled:opacity-40"
            >
              Crear
            </button>
          </div>

          {error === null ? null : (
            <p role="alert" className="px-4 text-sm text-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
