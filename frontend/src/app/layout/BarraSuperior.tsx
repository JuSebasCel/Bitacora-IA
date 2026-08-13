import { ChatTeardropTextIcon } from '@phosphor-icons/react/dist/csr/ChatTeardropText'
import { ListIcon } from '@phosphor-icons/react/dist/csr/List'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { RefObject } from 'react'
import { useSession } from '@/features/auth/session'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { PESO_DE_ICONO, TAMANO_DE_ICONO } from './navegacion'

type PropiedadesBarraSuperior = {
  cajonAbierto: boolean
  /** Id de la barra lateral, referenciado con aria-controls. */
  idDeNavegacion: string
  alternarCajon: () => void
  /** El shell necesita el botón para encerrar el foco y devolvérselo al cerrar. */
  refDelBotonDelCajon: RefObject<HTMLButtonElement | null>
  alAbrirChat: () => void
}

const CLASES_DE_CONTROL =
  'inline-flex items-center justify-center gap-2 rounded-md border border-filete px-2.5 py-1.5 text-sm text-texto-tenue transition-colors hover:border-filete-fuerte hover:text-texto'

/*
  Barra superior del shell: identidad del producto, control del cajón en
  pantallas angostas, acceso al panel de chat y cierre de sesión.
*/
export function BarraSuperior({
  cajonAbierto,
  idDeNavegacion,
  alternarCajon,
  refDelBotonDelCajon,
  alAbrirChat,
}: PropiedadesBarraSuperior) {
  const { usuario, cerrarSesion } = useSession()
  const IconoDelCajon = cajonAbierto ? XIcon : ListIcon

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-filete bg-panel px-3 md:px-4">
      <button
        ref={refDelBotonDelCajon}
        type="button"
        onClick={alternarCajon}
        aria-expanded={cajonAbierto}
        aria-controls={idDeNavegacion}
        aria-label={cajonAbierto ? 'Cerrar la navegación' : 'Abrir la navegación'}
        className={`${CLASES_DE_CONTROL} md:hidden`}
      >
        <IconoDelCajon size={TAMANO_DE_ICONO} weight={PESO_DE_ICONO} aria-hidden="true" />
      </button>

      <p className="text-lg font-semibold tracking-tight text-texto">Bitácora AI</p>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {usuario === null ? null : <NotificacionesDropdown idUsuario={usuario.id} />}

        <button
          type="button"
          onClick={alAbrirChat}
          aria-label="Abrir el panel de chat"
          className={`${CLASES_DE_CONTROL} px-2`}
        >
          <ChatTeardropTextIcon size={TAMANO_DE_ICONO} weight={PESO_DE_ICONO} aria-hidden="true" />
        </button>

        {usuario === null ? null : (
          <p className="hidden max-w-[16rem] truncate text-sm text-texto-tenue sm:block">
            {usuario.nombre}
          </p>
        )}

        <button type="button" onClick={cerrarSesion} className={CLASES_DE_CONTROL}>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
