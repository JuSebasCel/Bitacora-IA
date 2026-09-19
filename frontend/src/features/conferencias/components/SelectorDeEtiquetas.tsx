import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
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
}

const PASTILLA =
  'relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento'

export function SelectorDeEtiquetas({
  etiquetas,
  marcadas,
  alAlternar,
  alCrear,
  vacio,
}: PropsSelectorDeEtiquetas): ReactElement {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()

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

            return (
              <label
                key={etiqueta.id}
                className={`${PASTILLA} ${
                  marcada
                    ? 'bg-acento text-acento-contraste'
                    : 'bg-acento-tenue text-texto-tenue hover:text-texto'
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alAlternar(etiqueta.id)}
                  className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                />
                {etiqueta.nombre}
              </label>
            )
          })}
        </div>
      )}

      {alCrear === undefined ? null : (
        <form
          onSubmit={(evento) => {
            void alEnviar(evento)
          }}
          className="flex flex-col gap-1.5"
        >
          <div className="flex gap-2">
            <input
              value={nombre}
              onChange={(cambio) => {
                setNombre(cambio.target.value)
                setError(null)
              }}
              placeholder="Nueva etiqueta"
              aria-label="Nombre de la etiqueta nueva"
              className="h-10 min-w-0 flex-1 rounded-full bg-acento-tenue px-4 text-sm text-texto placeholder:text-texto-tenue focus:outline-none"
            />
            <button
              type="submit"
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
        </form>
      )}
    </div>
  )
}
