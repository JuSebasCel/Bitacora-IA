import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle'
import type { ReactElement, ReactNode } from 'react'

/*
  Error de nivel pantalla.

  Es distinto de `MensajeDeFormulario`, que acompaña a un formulario o a un
  campo concreto: aquel dice "revisa este dato", este dice "esto no se pudo
  mostrar".

  Recibe el mensaje ya resuelto por `mensajeDeError`. No conoce los códigos, y
  esa ignorancia es deliberada: un componente que no los ve no puede filtrar
  uno a la pantalla por descuido.
*/

export type PropsPanelDeError = {
  mensaje: string
  /** Salida opcional: volver al listado, reintentar. */
  children?: ReactNode
}

export function PanelDeError({ mensaje, children }: PropsPanelDeError): ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-error-borde px-4 py-4"
    >
      <p className="flex items-start gap-2 text-sm leading-relaxed text-texto">
        <WarningCircleIcon
          size={18}
          weight="regular"
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-error"
        />
        {mensaje}
      </p>
      {children === undefined ? null : children}
    </div>
  )
}
