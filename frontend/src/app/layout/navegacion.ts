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
  /*
    Si es true, la sección solo se marca activa en su ruta exacta. Conferencias
    lo necesita porque "Cargar conferencia" cuelga de su misma ruta base y las
    dos no pueden quedar marcadas a la vez.
  */
  readonly coincidenciaExacta: boolean
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
    coincidenciaExacta: true,
  },
  {
    etiqueta: 'Cargar conferencia',
    ruta: '/conferencias/nueva',
    icono: UploadSimpleIcon,
    coincidenciaExacta: false,
  },
  {
    etiqueta: 'Catálogo',
    ruta: '/catalogo',
    icono: CardsIcon,
    coincidenciaExacta: false,
  },
  {
    etiqueta: 'Memorias',
    ruta: '/memorias',
    icono: BookOpenIcon,
    coincidenciaExacta: false,
  },
  {
    etiqueta: 'Plantillas',
    ruta: '/plantillas',
    icono: LayoutIcon,
    coincidenciaExacta: false,
  },
  {
    etiqueta: 'Configuración',
    ruta: '/configuracion',
    icono: GearIcon,
    coincidenciaExacta: false,
  },
]
