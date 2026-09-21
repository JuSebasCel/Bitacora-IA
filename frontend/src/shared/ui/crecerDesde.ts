import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

/*
  Una pantalla que crece desde lo que se pulsó para abrirla.

  Es el FLIP del `Modal` —misma curva, misma duración, mismo desenfoque que se
  aclara— llevado a un cambio de ruta: la tarjeta se convierte en la pantalla
  entera. Se probó antes con la API de View Transitions y se descartó: solo
  hacía crecer la hoja de la vista previa, no la pantalla, y al volver la
  devolvía a la galería con un recorrido que se veía como un bajón raro.

  Son dos mitades porque entre pulsar y pintar la pantalla nueva hay un cambio
  de ruta: quien navega anota de dónde sale (`recordarOrigenDeApertura`) y la
  pantalla que llega lo consume al montarse (`useCrecerDesdeOrigen`).
*/

const DURACION = 300

/*
  Un origen viejo no debe animar nada: si la pantalla tardó en llegar —una
  lectura de red, un error— crecer desde una tarjeta que ya nadie recuerda
  haber pulsado se ve como un fallo, no como una transición.
*/
const VIGENCIA_MS = 1500

let origen: { readonly caja: DOMRect; readonly anotadoEl: number } | null = null

export function recordarOrigenDeApertura(elemento: Element | null): void {
  origen = elemento === null ? null : { caja: elemento.getBoundingClientRect(), anotadoEl: Date.now() }
}

/*
  Se olvida un instante después y no en el acto: en desarrollo, StrictMode
  monta, desmonta y vuelve a montar la pantalla, y si la primera pasada se lo
  llevaba, la que de verdad queda no encontraba origen y no animaba nada. Una
  microtarea no basta: React las vacía entre las dos pasadas.
*/
function consumirOrigen(): DOMRect | null {
  const anotado = origen
  setTimeout(() => {
    if (origen === anotado) {
      origen = null
    }
  }, 100)

  return anotado !== null && Date.now() - anotado.anotadoEl <= VIGENCIA_MS ? anotado.caja : null
}

export function useCrecerDesdeOrigen(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const pantalla = ref.current
    const desde = consumirOrigen()

    if (pantalla === null || desde === null) {
      return
    }

    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const hasta = pantalla.getBoundingClientRect()
    if (hasta.width === 0 || hasta.height === 0) {
      return
    }

    const dx = desde.left + desde.width / 2 - (hasta.left + hasta.width / 2)
    const dy = desde.top + desde.height / 2 - (hasta.top + hasta.height / 2)

    pantalla.style.transition = 'none'
    pantalla.style.transform = `translate(${dx}px, ${dy}px) scale(${desde.width / hasta.width}, ${desde.height / hasta.height})`
    pantalla.style.filter = 'blur(32px)'

    /*
      Al terminar se borra todo lo que se puso en línea. Un `transform` que se
      queda, aunque sea la identidad, crea bloque contenedor: cualquier
      `fixed` o `sticky` de dentro pasaría a medirse contra la pantalla y no
      contra la ventana.
    */
    const limpiar = (): void => {
      pantalla.style.transition = ''
      pantalla.style.transform = ''
      pantalla.style.filter = ''
    }

    const cuadro = requestAnimationFrame(() => {
      pantalla.style.transition = `transform ${DURACION}ms var(--ease-entrada), filter ${DURACION}ms ease`
      pantalla.style.transform = ''
      pantalla.style.filter = ''
    })
    const fin = setTimeout(limpiar, DURACION + 50)

    return () => {
      cancelAnimationFrame(cuadro)
      clearTimeout(fin)
      limpiar()
    }
  }, [ref])
}
