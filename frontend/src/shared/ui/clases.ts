/*
  Utilidades internas de estilo para los primitivos de UI.

  No se exportan desde el barril: son detalle de implementacion de
  `Button`, `Input` y `Field`.
*/

/** Une clases ignorando los valores vacios o ausentes. */
export function unirClases(...clases: Array<string | false | null | undefined>): string {
  return clases.filter((clase): clase is string => Boolean(clase)).join(' ')
}

/*
  Error de control, tomado del token del sistema de diseno (`--bitacora-error`).
  Es distinto de los semanticos `validado`/`pendiente`/`automatico`, que
  describen el estado de una ficha y no el de un control. El token ya se
  redefine bajo `prefers-color-scheme: dark`, asi que no hace falta la variante
  `dark:` de Tailwind.
*/
export const BORDE_ERROR = 'border-error-borde'
export const TEXTO_ERROR = 'text-error'

/*
  Base compartida entre `Input` y `Select`: mismo radio, superficie, tamaño de
  texto y estados hover/focus/disabled. Cada uno agrega encima solo lo que de
  verdad lo distingue (`placeholder` en Input; `appearance-none` y el cursor
  de puntero en Select) — antes las dos copias completas ya habían divergido
  una vez de forma silenciosa.

  Con el lenguaje nuevo: superficie tenue sin filete, radio de 16 y texto de
  16, igual que los campos del modal de carga. El borde sigue existiendo,
  transparente, para que el de error y el de foco no cambien el tamaño de
  la caja al aparecer.
*/
export const CLASES_CONTROL_BASE =
  'block w-full rounded-2xl border bg-acento-tenue px-4 py-2.5 text-base text-texto ' +
  'transition-colors enabled:hover:border-filete-fuerte focus:border-acento focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-55'
