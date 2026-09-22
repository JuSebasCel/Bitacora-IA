/*
  Fuente de verdad de la navegación del shell. El dock y el cajón móvil se
  construyen a partir de estas listas: las rutas no se repiten a mano en el JSX.

  **Los nombres, repensados.** "Catálogo" no decía qué contenía —sonaba a otra
  lista de cosas, indistinguible de "Conferencias"— y además la app ya llama
  *fichas* a esas unidades en cada pantalla ("12 fichas", "Marcar como
  validada"). Que la etiqueta del dock no coincidiera con el nombre del objeto
  era el problema de fondo. Los cuatro leídos juntos ahora cuentan el
  recorrido del producto:

      Conferencias  →  lo que entra, la fuente
      Fichas        →  lo que se extrajo de ellas
      Memorias      →  lo que se produce con eso
      Plantillas    →  la herramienta con la que se produce

  **El chat entra al dock.** Era la función más diferenciadora del producto y
  vivía detrás de un icono sin etiqueta en la barra superior: sin nombre, sin
  ruta y sin forma de volver a él. Sigue abriéndose como panel, pero ahora se
  llama por su nombre y desde el mismo sitio que todo lo demás.

  **Sin iconos, a propósito.** La jerarquía del dock es tipográfica. Ver
  `.item-de-dock` en `styles/index.css`.
*/

import type { IconWeight } from '@phosphor-icons/react'

/*
  El dock ya no lleva iconos, pero la barra superior sí (campana, cajón
  móvil): estas dos constantes siguen siendo la regla de que en todo el shell
  hay un solo peso y un solo tamaño de icono.
*/
export const PESO_DE_ICONO: IconWeight = 'regular'
export const TAMANO_DE_ICONO = 18

export type SeccionDeNavegacion = {
  /** Texto visible, tal como se lee en el dock. */
  readonly etiqueta: string
  /** Ruta absoluta que abre la sección. */
  readonly ruta: string
}

/*
  Fichas dejó de ser sección propia: se colapsó dentro de Conferencias, donde
  ahora se navega por columnas (conferencia → fichas → detalle). Los dos
  nombres se confundían entre sí —ambos sonaban a "lista de cosas"— y en el
  fondo describían el mismo recorrido partido en dos pantallas. La búsqueda
  global de fichas, que era lo único que se perdía al juntarlas, vive ahí
  como primera entrada de la columna.
*/
export const SECCIONES_DE_NAVEGACION: readonly SeccionDeNavegacion[] = [
  { etiqueta: 'Conferencias', ruta: '/conferencias' },
  /*
    Plantillas antes que Memorias: la plantilla es un requisito de la memoria,
    no al revés. El orden del dock sigue el orden real del trabajo.
  */
  { etiqueta: 'Plantillas', ruta: '/plantillas' },
  { etiqueta: 'Memorias', ruta: '/memorias' },
  /*
    Al final: no es un paso del trabajo sino el sitio donde queda lo que se
    subió, para volver a la fuente cuando una ficha se queda corta.
  */
  { etiqueta: 'Almacén', ruta: '/almacen' },
]

/*
  Acciones de creación, en el dock y no enterradas dentro de cada pantalla.

  Antes, cargar una conferencia exigía estar en Conferencias; generar una
  memoria, estar en Memorias. Eso pesa especialmente aquí, porque cargar una
  conferencia es la acción que desbloquea todo lo demás: sin ella, Fichas,
  Memorias y el chat están vacíos.

  Cada una navega a su sección con `?nuevo=1`, y la pantalla abre su panel al
  leer ese parámetro. Abrir un panel no crea nada hasta que se envía, así que
  recargar la URL es inofensivo.

  Cargar plantilla entró cuando dejó de crear algo en el acto. Antes,
  "crear plantilla" fabricaba una en blanco y navegaba a su editor, y
  dispararlo desde una URL habría creado otra en cada recarga. Ahora abre la
  explicación del método con su botón de subir, y no se crea nada hasta
  elegir el archivo.
*/
export type AccionDeNavegacion = {
  readonly etiqueta: string
  readonly ruta: string
}

export const ACCIONES_DE_NAVEGACION: readonly AccionDeNavegacion[] = [
  { etiqueta: 'Cargar conferencia', ruta: '/conferencias?nuevo=1' },
  { etiqueta: 'Cargar plantilla', ruta: '/plantillas?nuevo=1' },
  { etiqueta: 'Generar memoria', ruta: '/memorias?nuevo=1' },
]

/** El parámetro que le pide a una pantalla abrir su panel de creación. */
export const PARAMETRO_DE_CREACION = 'nuevo'

/** Comprueba que la ruta sea la sección o algo colgado de ella, no solo que empiece igual. */
function cuelgaDe(rutaActual: string, base: string): boolean {
  return rutaActual === base || rutaActual.startsWith(`${base}/`)
}

/*
  Qué sección está activa, por especificidad: gana la más profunda que coincida
  con la ruta actual. La regla resuelve el caso del detalle
  (/conferencias/cnf-alc-01 marca Conferencias) y, al ser una función pura, se
  prueba sin montar el shell.
*/
export function esSeccionActiva(seccion: SeccionDeNavegacion, rutaActual: string): boolean {
  if (!cuelgaDe(rutaActual, seccion.ruta)) {
    return false
  }

  return !SECCIONES_DE_NAVEGACION.some(
    (otra) => otra.ruta.length > seccion.ruta.length && cuelgaDe(rutaActual, otra.ruta),
  )
}
