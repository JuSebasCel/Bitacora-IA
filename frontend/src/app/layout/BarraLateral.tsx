import type { ReactElement, RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { MenuDeCuenta } from './MenuDeCuenta'
import { ACCIONES_DE_NAVEGACION, SECCIONES_DE_NAVEGACION, esSeccionActiva } from './navegacion'

type PropiedadesBarraLateral = {
  /** Identificador que el botón del cajón referencia con aria-controls. */
  id: string
  /** Solo aplica bajo 768px: sobre ese ancho el dock está siempre visible. */
  abierta: boolean
  /** Se invoca al elegir una sección, para cerrar el cajón en pantallas angostas. */
  alNavegar: () => void
  /** El shell lo enfoca al abrir el cajón y recorre lo enfocable de dentro. */
  refDelCajon: RefObject<HTMLElement | null>
  /** El chat es una sección del dock pero se abre como panel, no como ruta. */
  alAbrirChat: () => void
}

/*
  Dock de Menti Vault.

  Es tipografía y nada más: sin iconos, sin pastillas, sin color. El ítem
  activo no se marca con un fondo — crece de 24 a 28px y sube de peso, y el
  `line-height` se queda clavado en 24px para que la fila siga midiendo 40px
  y la columna no salte al cambiar de sección. Todo el movimiento vive en
  `.item-de-dock` (`styles/index.css`).

  Dos bloques: a dónde ir, y qué hacer. El chat vive en el segundo junto a
  las acciones de crear, porque no es un destino sino algo que se hace sobre
  todo lo demás; tenerlo entre las secciones lo hacía parecer una pantalla
  más a la que se navega.
*/

/* 40px de alto, 8px de padding, line-height clavado en 24px. */
const FILA = 'item-de-dock flex h-10 w-full items-center px-2 text-left leading-6'

function clasesDeItem(activo: boolean): string {
  return activo
    ? `${FILA} text-[28px] font-semibold text-nav-activo`
    : `${FILA} text-2xl font-normal text-nav-tenue`
}

export function BarraLateral({
  id,
  abierta,
  alNavegar,
  refDelCajon,
  alAbrirChat,
}: PropiedadesBarraLateral): ReactElement {
  const visibilidad = abierta ? 'flex' : 'hidden md:flex'
  const ubicacion = useLocation()
  const { usuario, cerrarSesion } = useSession()

  return (
    <nav
      ref={refDelCajon}
      id={id}
      /* Enfocable por programa, nunca por tabulación: recibe el foco al abrir el cajón. */
      tabIndex={-1}
      aria-label="Secciones de Menti Vault"
      /* El filete de la derecha separa el dock del contenido sin pesar: es el mismo `filete` del sistema. */
      className={`${visibilidad} dock-entra fixed inset-y-0 left-0 z-30 w-70 shrink-0 flex-col overflow-y-auto border-r border-filete bg-fondo p-4 focus:outline-none md:sticky md:z-auto md:h-dvh`}
    >
      {/*
        La cuenta vive aquí, no en una barra superior. Esa barra solo repetía
        el nombre de la sección —que el dock y el título de la pantalla ya
        decían— para sostener un par de controles.

        La campana de notificaciones se quitó por decisión de diseño. Ojo con
        la consecuencia: era el único acceso a la curaduría de temas
        propuestos (`NotificacionesDropdown`), así que ahora mismo no hay
        forma de aprobarlos ni rechazarlos desde la interfaz. El componente
        sigue existiendo y hay que devolverle una puerta.
      */}
      {usuario === null ? null : (
        <div className="flex h-14 items-center">
          <MenuDeCuenta usuario={usuario} cerrarSesion={cerrarSesion} />
        </div>
      )}

      {/*
        Sin el nombre del producto: el avatar ya ancla la identidad arriba, y
        repetir la marca en cada pantalla no orienta a nadie que ya está
        dentro. La referencia tampoco lo pone.
      */}
      <div className="mt-2 flex flex-col">
        {SECCIONES_DE_NAVEGACION.map((seccion) => (
          <Link
            key={seccion.ruta}
            to={seccion.ruta}
            onClick={alNavegar}
            aria-current={esSeccionActiva(seccion, ubicacion.pathname) ? 'page' : undefined}
            className={clasesDeItem(esSeccionActiva(seccion, ubicacion.pathname))}
          >
            {seccion.etiqueta}
          </Link>
        ))}
      </div>

      <p className="mt-6 flex h-10 items-center px-2 text-base leading-6 text-nav-tenue">Acciones</p>

      <div className="flex flex-col">
        {ACCIONES_DE_NAVEGACION.map((accion) => (
          <Link
            key={accion.ruta}
            to={accion.ruta}
            onClick={alNavegar}
            className={`${FILA} text-2xl font-normal text-nav-tenue`}
          >
            {accion.etiqueta}
          </Link>
        ))}

        {/*
          El chat cierra este bloque y no el de secciones: no es un sitio
          donde se esté, es algo que se hace sobre todo lo demás. Por eso
          tampoco queda nunca "activo" — sigue siendo un botón que abre un
          panel, no una ruta.
        */}
        <button
          type="button"
          onClick={() => {
            alNavegar()
            alAbrirChat()
          }}
          className={clasesDeItem(false)}
        >
          Chat
        </button>
      </div>
    </nav>
  )
}
