import type { ReactElement } from 'react'
import { useState } from 'react'
import { ConfirmacionEnSitio } from './ConfirmacionEnSitio'
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
  /**
   * Campo de ancho completo en vez de pastilla, con la lista del mismo ancho
   * abriéndose sobre él: el de la referencia para los formularios ("Estado",
   * "Proyecto" al crear una tarea). Se lee como un campo más de la columna.
   */
  completo?: boolean
  /**
   * Solo con `completo`: lo que se configura ("Extensión"), escrito en el
   * campo, con el valor elegido en tenue a la derecha. Sin rótulo el campo
   * enseña solo el valor, y en un formulario de varias opciones parecidas
   * no se sabía cuál era cuál.
   */
  rotulo?: string
  /**
   * Si se pasa, cada opción trae una ✕ para borrarla, que se confirma sobre
   * la propia opción (ver `ConfirmacionEnSitio`). Para listas que la persona
   * mantiene —eventos, ponentes—, no para opciones fijas.
   */
  alEliminar?: (valor: T) => void
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
  completo = false,
  rotulo,
  alEliminar,
}: PropsSelectorDeOpciones<T>): ReactElement {
  const [porBorrar, setPorBorrar] = useState<T | null>(null)
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

  function crear(): void {
    if (alCrear === undefined || creando || nombre.trim().length === 0) {
      return
    }

    setCreando(true)
    void alCrear(nombre).then((resultado) => {
      setCreando(false)

      if (resultado.ok) {
        setNombre('')
        setError(null)
        alCambiar(resultado.valor)
      } else {
        setError(resultado.mensaje)
      }
    })
  }

  return (
    <Popover
      alinear={alinear}
      etiquetaAccesible={`${etiquetaAccesible}: ${elegida?.etiqueta ?? vacio}`}
      className={completo ? 'w-full min-w-0' : 'min-w-0'}
      claseDelBoton={completo ? 'w-full cursor-pointer' : 'max-w-full cursor-pointer'}
      claseDelPanel={completo ? '' : 'w-56'}
      anchoDelBoton={completo}
      boton={
        <span
          className={
            completo
              ? 'flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl bg-acento-tenue px-4 text-left text-base text-texto transition-colors hover:bg-ilustracion'
              : 'flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full bg-acento-tenue px-4 text-base text-texto transition-colors hover:bg-ilustracion'
          }
        >
          {/* Con rótulo, el icono es el del campo; sin él, el de la opción elegida si trae uno. */}
          {(rotulo === undefined ? (elegida?.icono ?? icono) : icono) === undefined ? null : (
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg">
              {rotulo === undefined ? (elegida?.icono ?? icono) : icono}
            </span>
          )}
          {rotulo === undefined ? (
            <span className="truncate">{elegida?.etiqueta ?? vacio}</span>
          ) : (
            <>
              <span className="shrink-0">{rotulo}</span>
              <span className="ml-auto truncate pl-3 text-texto-tenue">{elegida?.etiqueta ?? vacio}</span>
            </>
          )}
          <span
            aria-hidden="true"
            className={`material-symbols-rounded icono-contorno shrink-0 text-lg opacity-60 ${completo ? 'ml-auto' : ''}`}
          >
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

            if (porBorrar === opcion.valor) {
              return (
                <div key={opcion.valor} className="flex h-12 items-center px-1">
                  <ConfirmacionEnSitio
                    completo
                    nombre={opcion.etiqueta}
                    alCancelar={() => setPorBorrar(null)}
                    alConfirmar={() => {
                      setPorBorrar(null)
                      alEliminar?.(opcion.valor)
                    }}
                  />
                </div>
              )
            }

            return (
              <div key={opcion.valor} className="group flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={activa}
                  onClick={() => {
                    alCambiar(opcion.valor)
                    cerrar()
                  }}
                  className={`flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 px-4 text-left text-sm transition-colors ${
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

                {alEliminar === undefined ? null : (
                  <button
                    type="button"
                    onClick={() => setPorBorrar(opcion.valor)}
                    aria-label={`Borrar ${opcion.etiqueta}`}
                    /* Aparece al pasar por encima o al enfocar: no ensucia la lista en reposo. */
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto-tenue opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100 focus-visible:opacity-100"
                  >
                    <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                      close
                    </span>
                  </button>
                )}
              </div>
            )
          })}

          {alCrear === undefined ? null : (
            /*
              Sin `<form>`, por la misma razón que el selector de etiquetas:
              esto puede acabar dentro de un formulario y anidarlos dispara una
              submisión nativa que recarga la aplicación.
            */
            <div className="mt-1 flex flex-col gap-1.5 border-t border-filete pt-2">
              <div className="flex gap-1.5">
                <input
                  value={nombre}
                  onChange={(cambio) => {
                    setNombre(cambio.target.value)
                    setError(null)
                  }}
                  onKeyDown={(tecla) => {
                    if (tecla.key === 'Enter') {
                      tecla.preventDefault()
                      crear()
                    }
                  }}
                  placeholder={textoDeCreacion}
                  aria-label={textoDeCreacion}
                  className="h-10 min-w-0 flex-1 rounded-full bg-acento-tenue px-3 text-sm text-texto placeholder:text-texto-tenue focus:outline-none"
                />
                <button
                  type="button"
                  onClick={crear}
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
            </div>
          )}
        </div>
      )}
    </Popover>
  )
}
