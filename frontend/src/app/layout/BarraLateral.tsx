import type { ReactElement, RefObject } from 'react'
import { Link, useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { MenuDeCuenta } from './MenuDeCuenta'
import { CampanaDeAvisos } from './CampanaDeAvisos'
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
  /** Solo en escritorio: el dock plegado se va del todo y deja el ancho al contenido. */
  plegada: boolean
  alPlegar: () => void
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
  plegada,
  alPlegar,
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
      /*
        Plegado va a ancho cero, no a un carril estrecho: este dock es
        tipografía y nada más, así que no tiene iconos a los que encogerse.
        Reducirlo dejaría una columna de palabras cortadas; quitarlo entero
        le da la pantalla al contenido, que es de lo que se trataba.

        `overflow-hidden` mientras se cierra para que el contenido se recorte
        en vez de re-partirse línea a línea durante la transición.
      */
      style={{ width: plegada ? 0 : undefined }}
      className={`${visibilidad} dock-entra fixed inset-y-0 left-0 z-30 w-70 shrink-0 flex-col border-r border-filete bg-fondo transition-[width] duration-500 ease-(--ease-entrada) focus:outline-none md:sticky md:z-auto md:h-dvh ${
        plegada ? 'overflow-hidden border-transparent p-0' : 'overflow-y-auto p-4'
      }`}
    >
      <div className="flex w-[calc(17.5rem-2rem)] min-w-0 flex-1 flex-col">
        {/*
        La cuenta vive aquí, no en una barra superior. Esa barra solo repetía
        el nombre de la sección —que el dock y el título de la pantalla ya
        decían— para sostener un par de controles.

        La campana volvió, pero solo con lo que pide una respuesta: las
        conferencias que te compartieron y lo que contestaron a las tuyas.
      */}
        <div className="flex items-start gap-1">
          {usuario === null ? null : (
            <div className="min-w-0 flex-1">
              <MenuDeCuenta usuario={usuario} cerrarSesion={cerrarSesion} />
            </div>
          )}

          {/*
            Vuelve la campana. Se quito en el rediseno y con ella el unico
            acceso a la curaduria de temas; ahora ademas es donde llegan las
            invitaciones a conferencias compartidas, que sin un sitio donde
            aparecer no se podrian ni aceptar.
          */}
          {usuario === null ? null : <CampanaDeAvisos idUsuario={usuario.id} />}

          <button
            type="button"
            onClick={alPlegar}
            aria-label="Ocultar el panel lateral"
            className="mt-2 hidden size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto md:flex"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl">
              left_panel_close
            </span>
          </button>
        </div>

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

        <p className="mt-6 flex h-10 items-center px-2 text-base leading-6 text-nav-tenue">
          Acciones
        </p>

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
      </div>
    </nav>
  )
}
