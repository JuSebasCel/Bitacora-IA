import { ListIcon } from '@phosphor-icons/react/dist/csr/List'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement, RefObject } from 'react'
import { PESO_DE_ICONO, TAMANO_DE_ICONO } from './navegacion'

type PropiedadesBarraSuperior = {
  cajonAbierto: boolean
  /** Id del dock, referenciado con aria-controls. */
  idDeNavegacion: string
  alternarCajon: () => void
  /** El shell necesita el botón para encerrar el foco y devolvérselo al cerrar. */
  refDelBotonDelCajon: RefObject<HTMLButtonElement | null>
}

/*
  Solo existe bajo 768px, y solo para abrir el dock.

  En escritorio no hay barra superior: la cuenta, las notificaciones y la
  identidad del producto se mudaron al dock, y lo único que quedaba aquí era
  el nombre de la sección activa — que el dock ya marca y el título de la
  pantalla ya dice. Era la misma palabra tres veces para sostener dos botones.

  En móvil el dock está cerrado, así que sigue haciendo falta una manija para
  abrirlo: eso, y nada más.
*/
export function BarraSuperior({
  cajonAbierto,
  idDeNavegacion,
  alternarCajon,
  refDelBotonDelCajon,
}: PropiedadesBarraSuperior): ReactElement {
  const IconoDelCajon = cajonAbierto ? XIcon : ListIcon

  return (
    <header className="flex h-14 shrink-0 items-center px-3 md:hidden">
      <button
        ref={refDelBotonDelCajon}
        type="button"
        onClick={alternarCajon}
        aria-expanded={cajonAbierto}
        aria-controls={idDeNavegacion}
        aria-label={cajonAbierto ? 'Cerrar la navegación' : 'Abrir la navegación'}
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:text-texto"
      >
        <IconoDelCajon size={TAMANO_DE_ICONO} weight={PESO_DE_ICONO} aria-hidden="true" />
      </button>
    </header>
  )
}
