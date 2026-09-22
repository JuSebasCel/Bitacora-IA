import { driver } from 'driver.js'
import type { DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import './recorrido.css'

/*
  El recorrido guiado: señala cada parte del dock y dice para qué sirve.

  Se apoya en `driver.js` y no en uno propio. Resaltar un elemento, recortar
  el velo a su alrededor, colocar el globo donde quepa y seguir al elemento si
  la ventana cambia es mucho trabajo fino, y esa librería ya lo hace bien sin
  dependencias. Aquí solo va el texto y el estilo (`recorrido.css`).

  Los pasos apuntan a marcas `data-recorrido` del dock, no a clases ni a
  rutas: las rutas cambian con la base de despliegue (`/apps/vault`) y las
  clases con cualquier ajuste visual, y el recorrido no debería romperse por
  ninguna de las dos cosas. Un paso cuyo elemento no esté en pantalla se
  enseña centrado, sin resaltar nada, en vez de saltarse.
*/

const PASOS: readonly DriveStep[] = [
  {
    popover: {
      title: 'Bienvenido a Menti Vault',
      description:
        'Aquí conviertes conferencias en fichas citables y, con ellas, en memorias listas para entregar. Te enseño dónde está cada cosa en menos de un minuto.',
    },
  },
  {
    element: '[data-recorrido="accion-cargar-conferencia"]',
    popover: {
      title: 'Carga una conferencia',
      description:
        'Sube el audio o la transcripción de una charla. La IA la transcribe, saca las ideas que vale la pena citar y las ordena por tema.',
    },
  },
  {
    element: '[data-recorrido="conferencias"]',
    popover: {
      title: 'Conferencias y fichas',
      description:
        'Tus charlas, agrupadas por evento. Entra a una para ver sus fichas: cada una con lo que se dijo, una versión fácil de leer y, si hay audio, el momento exacto para escucharlo.',
    },
  },
  {
    element: '[data-recorrido="plantillas"]',
    popover: {
      title: 'Plantillas',
      description:
        'Diseña el documento en Word y marca con [[Nombre]] los campos que la IA debe llenar. Aquí le dices qué escribir en cada uno y con qué tono.',
    },
  },
  {
    element: '[data-recorrido="memorias"]',
    popover: {
      title: 'Memorias',
      description:
        'Una memoria junta una conferencia con una plantilla: la IA redacta cada campo a partir de las fichas, y la descargas en PDF o Word.',
    },
  },
  {
    element: '[data-recorrido="avisos"]',
    popover: {
      title: 'Avisos',
      description: 'Cuando alguien te comparte una conferencia, o responde a una que compartiste, aparece aquí.',
    },
  },
  {
    element: '[data-recorrido="cuenta"]',
    popover: {
      title: 'Tu cuenta',
      description:
        'Desde el logo llegas a Configuración: tus claves de IA, tus preferencias y este mismo recorrido, por si quieres volver a verlo.',
    },
  },
]

/** Abre el recorrido. `alTerminar` corre al acabarlo o al cerrarlo antes, que cuenta igual como visto. */
export function iniciarRecorrido(alTerminar?: () => void): void {
  const recorrido = driver({
    steps: [...PASOS],
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    popoverClass: 'recorrido-de-menti',
    stagePadding: 6,
    stageRadius: 16,
    overlayOpacity: 0.55,
    smoothScroll: true,
    onDestroyed: () => alTerminar?.(),
  })

  recorrido.drive()
}
