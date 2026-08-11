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
