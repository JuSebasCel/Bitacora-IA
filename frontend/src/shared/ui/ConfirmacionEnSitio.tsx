import { motion, useReducedMotion } from 'motion/react'
import type { ReactElement } from 'react'

/*
  Confirmar un borrado sobre la propia pastilla, sin abrir nada.

  Pulsar la ✕ de una etiqueta (o de un evento, o de un ponente) no borra: la
  pastilla se alza un poco y se vuelve la pregunta, con la ✗ a la izquierda
  para echarse atrás y el ✓ a la derecha para confirmar. Es el orden de
  lectura: primero la salida segura, y el gesto que no tiene vuelta al final,
  donde hay que ir a buscarlo.

  Antes la pregunta era el propio texto de la pastilla y había que pulsar en
  el centro para confirmar: no parecía un botón, y la ✕ que la acompañaba
  cancelaba, justo lo contrario de lo que acababa de hacer la otra ✕.

  El alzado usa la curva de rebote suave del sistema: crece un 6 % y sube dos
  píxeles con sombra, lo justo para que se note que ahora es otra cosa.
*/

export type PropsConfirmacionEnSitio = {
  /** Lo que se va a borrar, tal como se lee en la pastilla. */
  nombre: string
  alConfirmar: () => void
  alCancelar: () => void
}

const BOTON =
  'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-acento-contraste'

export function ConfirmacionEnSitio({ nombre, alConfirmar, alCancelar }: PropsConfirmacionEnSitio): ReactElement {
  const reducirMovimiento = useReducedMotion()

  return (
    <motion.span
      role="group"
      aria-label={`¿Borrar ${nombre}?`}
      initial={reducirMovimiento ? false : { scale: 1, y: 0 }}
      animate={{ scale: 1.06, y: -2 }}
      transition={{ duration: 0.3, ease: [0.38, 0.49, 0, 1.2] }}
      onKeyDown={(tecla) => {
        if (tecla.key === 'Escape') {
          tecla.stopPropagation()
          alCancelar()
        }
      }}
      className="flex items-center gap-1 rounded-full bg-error px-1 py-0.5 text-sm text-acento-contraste shadow-[0_4px_12px_rgb(0_0_0/0.25)]"
    >
      <button
        type="button"
        onClick={alCancelar}
        aria-label={`Conservar ${nombre}`}
        className={`${BOTON} hover:bg-acento-contraste/20`}
      >
        <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
          close
        </span>
      </button>

      <span className="max-w-48 truncate px-1">¿Borrar «{nombre}»?</span>

      <button
        type="button"
        autoFocus
        onClick={alConfirmar}
        aria-label={`Borrar ${nombre}`}
        className={`${BOTON} bg-acento-contraste/25 hover:bg-acento-contraste/40`}
      >
        <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
          check
        </span>
      </button>
    </motion.span>
  )
}
