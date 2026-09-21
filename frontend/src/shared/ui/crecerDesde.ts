import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/*
  Una pantalla que crece desde lo que se pulsó para abrirla, y que al cerrarse
  vuelve a encogerse en él.

  Es el gesto del `Modal` —crecer desde el botón— llevado a un cambio de ruta:
  la tarjeta se convierte en la pantalla entera. Se probó antes con la API de
  View Transitions y se descartó: solo hacía crecer la hoja de la vista
  previa, no la pantalla, y al volver la bajaba con un recorrido que se veía
  como un salto raro.

  **Sin desenfoque, a diferencia del modal.** Medido a 144 Hz: con `blur()`
  sobre una pantalla entera el cuadro mediano subía a 21–27 ms y la animación
  daba 14 cuadros en vez de ~40; con solo `transform` y `opacity` se queda en
  8–9 ms. En la ventana de un modal el desenfoque sale barato porque es
  pequeña; sobre toda la pantalla el navegador tiene que repintarla entera en
  cada cuadro. El fundido de opacidad hace el trabajo que hacía el
  desenfoque: tapar la deformación de la escala en los primeros cuadros.

  Va con la Web Animations API y no con `transition` en línea: no depende de
  esperar un `requestAnimationFrame` para soltar el primer cuadro, y al
  terminar no deja nada escrito en el elemento. Un `transform` que se queda,
  aunque sea la identidad, crea bloque contenedor y cambia contra qué se
  miden los `fixed` y `sticky` de dentro.

  Son dos mitades en cada sentido porque en medio hay un cambio de ruta:

  - abrir: la tarjeta anota su caja (`recordarOrigenDeApertura`) y la
    pantalla nueva crece desde ahí (`useCrecerDesdeOrigen`);
  - cerrar: la pantalla anota su caja al desmontarse, con la clave de lo que
    mostraba, y la tarjeta con esa clave aterriza desde ahí hasta su sitio
    (`useAterrizarDesdeCierre`). Se anima la tarjeta y no la pantalla porque
    la pantalla ya no existe cuando la galería vuelve.

  Al aterrizar, lo que rodea a la tarjeta se esconde y aparece cuando ella
  ya está casi en su sitio. La tarjeta arranca del tamaño de la pantalla
  entera, y si la galería estaba a la vista, pasaba por encima de las otras
  tarjetas y del título mientras se encogía: se leía como una plantilla que
  se comía a otra. Es el patrón de "transformación de contenedor" de
  Material: lo que se transforma nunca comparte pantalla con lo que taparía.
*/

const DURACION_DE_APERTURA = 380
const DURACION_DE_CIERRE = 340

/* Cuándo empieza a aparecer lo que rodea a la tarjeta que aterriza, y cuánto tarda. */
const ESPERA_DEL_ENTORNO = 200
const DURACION_DEL_ENTORNO = 220

/* `--ease-entrada`: la Web Animations API no resuelve variables CSS en `easing`. */
const CURVA = 'cubic-bezier(0.37, 0.35, 0, 1)'

/*
  Una anotación vieja no debe animar nada: si la pantalla tardó en llegar
  —una lectura de red, un error— crecer desde una tarjeta que ya nadie
  recuerda haber pulsado se ve como un fallo, no como una transición.
*/
const VIGENCIA_MS = 1500

type Anotacion = { readonly caja: DOMRect; readonly anotadoEl: number; readonly clave: string | null }

let apertura: Anotacion | null = null
let cierre: Anotacion | null = null

export function recordarOrigenDeApertura(elemento: Element | null): void {
  apertura = elemento === null ? null : { caja: elemento.getBoundingClientRect(), anotadoEl: Date.now(), clave: null }
}

/*
  Se olvida un instante después y no en el acto: en desarrollo, StrictMode
  monta, desmonta y vuelve a montar la pantalla, y si la primera pasada se la
  llevaba, la que de verdad queda no la encontraba y no animaba nada. Una
  microtarea no basta: React las vacía entre las dos pasadas.
*/
function vigente(anotacion: Anotacion | null, olvidar: (anotada: Anotacion) => void): DOMRect | null {
  if (anotacion === null) {
    return null
  }

  setTimeout(() => olvidar(anotacion), 100)
  return Date.now() - anotacion.anotadoEl <= VIGENCIA_MS ? anotacion.caja : null
}

/* jsdom no trae `animate` ni `matchMedia`: en pruebas, simplemente no hay animación. */
function sinMovimiento(elemento: HTMLElement): boolean {
  return (
    typeof elemento.animate !== 'function' ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  )
}

/*
  Todo lo que rodea a `elemento` dentro de `escena`: los hermanos de cada
  eslabón entre los dos. Esconder la escena entera escondería también la
  tarjeta, que es su descendiente; así queda fuera solo su camino.
*/
function entornoDe(elemento: HTMLElement, escena: HTMLElement): HTMLElement[] {
  const entorno: HTMLElement[] = []

  for (let eslabon: HTMLElement | null = elemento; eslabon !== null && eslabon !== escena; eslabon = eslabon.parentElement) {
    const padre: HTMLElement | null = eslabon.parentElement
    if (padre === null) {
      break
    }

    for (const hermano of padre.children) {
      if (hermano !== eslabon && hermano instanceof HTMLElement) {
        entorno.push(hermano)
      }
    }
  }

  return entorno
}

/* La transformación que calza `caja` exactamente encima de `sobre`, como el FLIP del modal. */
function calzar(caja: DOMRect, sobre: DOMRect): string {
  const dx = sobre.left + sobre.width / 2 - (caja.left + caja.width / 2)
  const dy = sobre.top + sobre.height / 2 - (caja.top + caja.height / 2)

  return `translate(${dx}px, ${dy}px) scale(${sobre.width / caja.width}, ${sobre.height / caja.height})`
}

export function useCrecerDesdeOrigen(ref: RefObject<HTMLElement | null>, clave: string): void {
  useLayoutEffect(() => {
    const pantalla = ref.current
    const desde = vigente(apertura, (anotada) => {
      if (apertura === anotada) {
        apertura = null
      }
    })

    /* Al irse, anota dónde estaba: es desde donde su tarjeta aterriza al volver. */
    const anotarCierre = (): void => {
      if (pantalla !== null && pantalla.isConnected) {
        cierre = { caja: pantalla.getBoundingClientRect(), anotadoEl: Date.now(), clave }
      }
    }

    if (pantalla === null || desde === null || sinMovimiento(pantalla)) {
      return anotarCierre
    }

    const hasta = pantalla.getBoundingClientRect()
    if (hasta.width === 0 || hasta.height === 0) {
      return anotarCierre
    }

    /*
      La opacidad llega a 1 antes que la escala a su tamaño: si fueran a la
      par, la pantalla pasaría medio recorrido semitransparente y se leería
      como un fundido, no como algo que crece.
    */
    const animacion = pantalla.animate(
      [
        { transform: calzar(hasta, desde), opacity: 0 },
        { opacity: 1, offset: 0.45 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: DURACION_DE_APERTURA, easing: CURVA },
    )

    return () => {
      anotarCierre()
      animacion.cancel()
    }
  }, [ref, clave])
}

export function useAterrizarDesdeCierre(ref: RefObject<HTMLElement | null>, clave: string): void {
  useLayoutEffect(() => {
    const tarjeta = ref.current
    const desde = vigente(cierre?.clave === clave ? cierre : null, (anotada) => {
      if (cierre === anotada) {
        cierre = null
      }
    })

    if (tarjeta === null || desde === null || sinMovimiento(tarjeta)) {
      return
    }

    const hasta = tarjeta.getBoundingClientRect()
    if (hasta.width === 0 || hasta.height === 0) {
      return
    }

    const animacion = tarjeta.animate(
      [
        { transform: calzar(hasta, desde), opacity: 0, zIndex: 10 },
        { opacity: 1, offset: 0.35, zIndex: 10 },
        { transform: 'none', opacity: 1, zIndex: 10 },
      ],
      { duration: DURACION_DE_CIERRE, easing: CURVA },
    )

    /*
      `fill: backwards` las mantiene escondidas durante la espera: sin él
      estarían a la vista hasta que arranca su fundido, que es justo el
      momento en que la tarjeta grande les pasa por encima.
    */
    const escena = tarjeta.closest<HTMLElement>('[data-escena-de-aterrizaje]')
    const entorno = (escena === null ? [] : entornoDe(tarjeta, escena)).map((vecino) =>
      vecino.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: DURACION_DEL_ENTORNO,
        delay: ESPERA_DEL_ENTORNO,
        easing: 'ease-out',
        fill: 'backwards',
      }),
    )

    return () => {
      animacion.cancel()
      entorno.forEach((fundido) => fundido.cancel())
    }
  }, [ref, clave])
}
