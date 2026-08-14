import { ChatTeardropTextIcon } from '@phosphor-icons/react/dist/csr/ChatTeardropText'
import { ListIcon } from '@phosphor-icons/react/dist/csr/List'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { RefObject } from 'react'
import { useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { MenuDeCuenta } from './MenuDeCuenta'
import { NotificacionesDropdown } from './NotificacionesDropdown'
import { esSeccionActiva, PESO_DE_ICONO, SECCIONES_DE_NAVEGACION, TAMANO_DE_ICONO } from './navegacion'

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
  const ubicacion = useLocation()
  const IconoDelCajon = cajonAbierto ? XIcon : ListIcon

  /*
    Configuración ya no está en `SECCIONES_DE_NAVEGACION` (se administra desde
    el menú de cuenta, no la barra lateral), pero la etiqueta de sección
    activa aquí sí la reconoce: es la única ruta protegida fuera del índice.
  */
  const tituloDeSeccion =
    SECCIONES_DE_NAVEGACION.find((seccion) => esSeccionActiva(seccion, ubicacion.pathname))?.etiqueta ??
    (ubicacion.pathname.startsWith('/configuracion') ? 'Configuración' : undefined)

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

      <p className="shrink-0 text-lg font-semibold tracking-tight text-texto">Bitácora AI</p>

      {/*
        Orientación real (qué sección se está viendo), no relleno: la barra
        lateral ya lo muestra en escritorio ancho, pero deja el centro de la
        barra superior vacío. Oculto en móvil, donde el espacio es corto y el
        cajón ya cumple ese papel.
      */}
      {tituloDeSeccion === undefined ? null : (
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span aria-hidden="true" className="h-4 w-px bg-filete" />
          <p className="truncate text-sm text-texto-tenue">{tituloDeSeccion}</p>
        </div>
      )}

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
          <>
            <span aria-hidden="true" className="h-5 w-px bg-filete" />
            <MenuDeCuenta usuario={usuario} cerrarSesion={cerrarSesion} />
          </>
        )}
      </div>
    </header>
  )
}
