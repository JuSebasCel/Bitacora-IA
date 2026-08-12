import type { ReactElement } from 'react'

/*
  Error de nivel formulario (credenciales, campos vacíos, correo ya registrado,
  archivo inválido). Siempre recibe un mensaje ya traducido por
  `mensajeDeError`: aquí nunca llega un código crudo del catálogo.

  Es distinto de `PanelDeError`, que es de nivel pantalla (una conferencia que
  no se encuentra, un procesamiento interrumpido). Este vive junto al campo o
  al formulario que falló, no reemplaza el contenido de la pantalla entera.

  El color sale del token de error del sistema de diseño, que ya se redefine
  bajo `prefers-color-scheme: dark`. Por eso no hace falta la variante `dark:`.
*/

const TEXTO_ERROR = 'text-error'
const BORDE_ERROR = 'border-error-borde'

export type PropsMensajeDeFormulario = {
  id: string
  children: string
}

export function MensajeDeFormulario({ id, children }: PropsMensajeDeFormulario): ReactElement {
  return (
    <p
      id={id}
      role="alert"
      className={`rounded-md border px-3 py-2 text-sm ${BORDE_ERROR} ${TEXTO_ERROR}`}
    >
      {children}
    </p>
  )
}
