import { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen'
import { CardsIcon } from '@phosphor-icons/react/dist/csr/Cards'
import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { LayoutIcon } from '@phosphor-icons/react/dist/csr/Layout'
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone'
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/csr/UploadSimple'
import type { Icon, IconWeight } from '@phosphor-icons/react'

/*
  Fuente de verdad de la navegación del shell. La barra lateral, el cajón móvil
  y cualquier índice posterior se construyen a partir de esta lista: las rutas
  no se repiten a mano en el JSX.
*/

export type SeccionDeNavegacion = {
  /** Texto visible de la sección, tal como se lee en la barra lateral. */
  readonly etiqueta: string
  /** Ruta absoluta que abre la sección. */
  readonly ruta: string
  /** Icono de la sección (familia Phosphor, un solo peso en todo el shell). */
  readonly icono: Icon
}

/** Un solo peso de icono en todo el shell, activo o no. */
export const PESO_DE_ICONO: IconWeight = 'regular'

/** Tamaño único de los iconos de navegación, en píxeles. */
export const TAMANO_DE_ICONO = 18

export const SECCIONES_DE_NAVEGACION: readonly SeccionDeNavegacion[] = [
  {
    etiqueta: 'Conferencias',
    ruta: '/conferencias',
    icono: MicrophoneIcon,
  },
  {
    etiqueta: 'Cargar conferencia',
    ruta: '/conferencias/nueva',
    icono: UploadSimpleIcon,
  },
  {
    etiqueta: 'Catálogo',
    ruta: '/catalogo',
    icono: CardsIcon,
  },
  {
    etiqueta: 'Memorias',
    ruta: '/memorias',
    icono: BookOpenIcon,
  },
  {
    etiqueta: 'Plantillas',
    ruta: '/plantillas',
    icono: LayoutIcon,
  },
  {
    etiqueta: 'Configuración',
    ruta: '/configuracion',
    icono: GearIcon,
  },
]

/** Comprueba que la ruta sea la sección o algo colgado de ella, no solo que empiece igual. */
function cuelgaDe(rutaActual: string, base: string): boolean {
  return rutaActual === base || rutaActual.startsWith(`${base}/`)
}

/*
  Qué sección está activa, por especificidad: gana la más profunda que coincida
  con la ruta actual.

  Sustituye al par `coincidenciaExacta` + `end` de NavLink que usaba F1, que
  dejó de servir al entrar el detalle de conferencia. Con `end`,
  /conferencias/cnf-alc-01 no marcaba ninguna sección; sin `end`, se marcaban
  dos a la vez en /conferencias/nueva. La regla de especificidad resuelve los
  dos casos y, al ser una función pura, se prueba sin montar el shell.
*/
export function esSeccionActiva(seccion: SeccionDeNavegacion, rutaActual: string): boolean {
  if (!cuelgaDe(rutaActual, seccion.ruta)) {
    return false
  }

  return !SECCIONES_DE_NAVEGACION.some(
    (otra) => otra.ruta.length > seccion.ruta.length && cuelgaDe(rutaActual, otra.ruta),
  )
}
