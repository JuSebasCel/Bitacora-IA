import type { RefObject } from 'react'
import { NavLink } from 'react-router'
import { PESO_DE_ICONO, SECCIONES_DE_NAVEGACION, TAMANO_DE_ICONO } from './navegacion'

type PropiedadesBarraLateral = {
  /** Identificador que el botón del cajón referencia con aria-controls. */
  id: string
  /** Solo aplica bajo 768px: sobre ese ancho la barra está siempre visible. */
  abierta: boolean
  /** Se invoca al elegir una sección, para cerrar el cajón en pantallas angostas. */
  alNavegar: () => void
  /** El shell la enfoca al abrir el cajón y recorre lo enfocable de dentro. */
  refDelCajon: RefObject<HTMLElement | null>
}

const CLASES_DE_ENLACE =
  'flex items-center gap-3 border-l-2 py-2 pr-3 pl-4 text-sm transition-colors'

function clasesDelEnlace(activo: boolean): string {
  if (activo) {
    return `${CLASES_DE_ENLACE} border-acento bg-acento-tenue font-medium text-acento`
  }

  return `${CLASES_DE_ENLACE} border-transparent text-texto-tenue hover:border-filete-fuerte hover:text-texto`
}

/*
  Índice de secciones del shell. En escritorio es una columna fija a la
  izquierda; bajo 768px se comporta como cajón, oculto salvo que `abierta` sea
  true. La lista sale siempre de SECCIONES_DE_NAVEGACION.
*/
export function BarraLateral({ id, abierta, alNavegar, refDelCajon }: PropiedadesBarraLateral) {
  const visibilidad = abierta ? 'flex' : 'hidden md:flex'

  return (
    <nav
      ref={refDelCajon}
      id={id}
      /* Enfocable por programa, nunca por tabulación: recibe el foco al abrir el cajón. */
      tabIndex={-1}
      aria-label="Secciones de Bitácora AI"
      className={`${visibilidad} fixed top-14 bottom-0 left-0 z-30 w-64 shrink-0 flex-col overflow-y-auto border-r border-filete bg-panel pt-4 pb-6 focus:outline-none md:sticky md:top-14 md:bottom-auto md:z-auto md:h-[calc(100dvh-3.5rem)] md:w-56`}
    >
      <p className="coordenada px-4 pb-3 text-[0.6875rem] tracking-[0.14em] text-texto-tenue uppercase">
        Índice
      </p>
      <ul className="flex flex-col border-t border-filete">
        {SECCIONES_DE_NAVEGACION.map((seccion) => {
          const Icono = seccion.icono

          return (
            <li key={seccion.ruta}>
              <NavLink
                to={seccion.ruta}
                end={seccion.coincidenciaExacta}
                onClick={alNavegar}
                className={({ isActive }) => clasesDelEnlace(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <Icono
                      size={TAMANO_DE_ICONO}
                      weight={PESO_DE_ICONO}
                      aria-hidden="true"
                      className={isActive ? 'text-acento' : 'text-texto-tenue'}
                    />
                    <span className="truncate">{seccion.etiqueta}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
