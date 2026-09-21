import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/*
  Encaja la hoja que pinta `docx-preview` en el espacio que tiene, y deja
  acercarla o alejarla a partir de ahí.

  La librería pinta la página a su tamaño real (una carta son 816 px de
  ancho) y no ofrece zoom. Antes la miniatura la encogía con un `scale` fijo
  de 0,4 y recortaba lo que no cabía, y la vista previa grande la dejaba a
  tamaño real: la hoja se salía por los lados con barra horizontal y no se
  llegaba a ver ni media página. Ahora se calcula cuánto cabe.

  Con `zoom` y no con `transform: scale`: el zoom también encoge el espacio
  que ocupa la hoja, así que el contenedor mide lo que se ve y el scroll
  llega justo hasta el final de la página. Con `scale` la caja seguía
  midiendo el tamaño real y dejaba un hueco en blanco debajo.

  - `ancho`: la hoja ocupa todo el ancho y se recorre hacia abajo. Para la
    vista previa, donde se lee.
  - `hoja-entera`: cabe la página completa, alto incluido. Para la miniatura,
    donde lo que importa es reconocerla de un vistazo.

  El zoom de la persona es un factor sobre ese encaje, no un porcentaje
  absoluto: si la ventana cambia de tamaño, la hoja se vuelve a encajar y
  conserva lo que se había acercado. Se guarda en un `ref` además de en
  estado porque la rueda dispara decenas de eventos seguidos y cada uno tiene
  que partir del valor que dejó el anterior, no del último render.
*/
export type AjusteDeHoja = 'ancho' | 'hoja-entera'

/* Entre un cuarto y el triple del tamaño real: más allá no se lee nada que no se leyera antes. */
const ZOOM_MINIMO = 0.25
const ZOOM_MAXIMO = 3

/* Cuánto cambia el zoom por cada píxel de rueda. Exponencial para que acercar y alejar se sientan iguales. */
const SENSIBILIDAD_DE_LA_RUEDA = 0.002

/** Punto que se queda quieto al hacer zoom, relativo a la esquina visible del contenedor. */
export type Ancla = { readonly x: number; readonly y: number }

export type ZoomDeHoja = {
  /** El zoom efectivo respecto al tamaño real (1 = 100 %), o `null` mientras no hay hoja. */
  readonly zoom: number | null
  readonly escalar: (multiplicador: number, ancla?: Ancla) => void
  /** Vuelve al encaje, sin zoom de la persona. */
  readonly ajustar: () => void
}

/* El ancho y alto naturales de la primera página, leídos de su estilo en puntos: no dependen del zoom ya aplicado. */
function medidasDeHoja(contenedor: HTMLElement): { ancho: number; alto: number } | null {
  const hoja = contenedor.querySelector<HTMLElement>('section.docx')
  if (hoja === null) {
    return null
  }

  const enPixeles = (valor: string): number => {
    const numero = Number.parseFloat(valor)
    return valor.endsWith('pt') ? (numero * 96) / 72 : numero
  }

  const ancho = enPixeles(hoja.style.width)
  const alto = enPixeles(hoja.style.minHeight)

  return Number.isFinite(ancho) && ancho > 0 && Number.isFinite(alto) && alto > 0 ? { ancho, alto } : null
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

export function useAjusteDeHoja(
  contenedorRef: RefObject<HTMLElement | null>,
  pintada: boolean,
  ajuste: AjusteDeHoja,
  /* Aire alrededor de la hoja, en píxeles de pantalla. */
  margen = 0,
  opciones: { readonly conRueda?: boolean } = {},
): ZoomDeHoja {
  const { conRueda = false } = opciones
  const [zoom, setZoom] = useState<number | null>(null)
  const encaje = useRef(1)
  const factor = useRef(1)

  const aplicar = useCallback(
    (ancla?: Ancla): void => {
      const contenedor = contenedorRef.current
      const envoltura = contenedor?.querySelector<HTMLElement>('.docx-wrapper')
      if (contenedor === null || contenedor === undefined || envoltura === null || envoltura === undefined) {
        return
      }

      const antes = Number.parseFloat(envoltura.style.zoom) || encaje.current
      const despues = encaje.current * factor.current

      envoltura.style.zoom = String(despues)
      setZoom(despues)

      /*
        El punto bajo el cursor se queda bajo el cursor: el contenido crece
        alrededor de él, no desde la esquina de arriba. Sin esto, acercar
        con la rueda sobre el final de la hoja la mandaba fuera de la vista.
      */
      if (ancla !== undefined) {
        const proporcion = despues / antes
        contenedor.scrollLeft = (contenedor.scrollLeft + ancla.x) * proporcion - ancla.x
        contenedor.scrollTop = (contenedor.scrollTop + ancla.y) * proporcion - ancla.y
      }
    },
    [contenedorRef],
  )

  const escalar = useCallback(
    (multiplicador: number, ancla?: Ancla): void => {
      /*
        Los topes acotan el zoom de la persona, no el encaje: una miniatura
        estrecha puede necesitar menos de un cuarto para caber, y eso no es
        algo que la persona haya pedido. Por eso el factor 1 siempre queda
        dentro del rango.
      */
      const minimo = Math.min(1, ZOOM_MINIMO / encaje.current)
      const maximo = Math.max(1, ZOOM_MAXIMO / encaje.current)
      factor.current = acotar(factor.current * multiplicador, minimo, maximo)
      aplicar(ancla)
    },
    [aplicar],
  )

  const ajustar = useCallback((): void => {
    factor.current = 1
    aplicar()
  }, [aplicar])

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!pintada || contenedor === null) {
      setZoom(null)
      return
    }

    const encajar = (): void => {
      const hoja = medidasDeHoja(contenedor)
      const anchoDisponible = contenedor.clientWidth - margen * 2
      const altoDisponible = contenedor.clientHeight - margen * 2
      if (hoja === null || anchoDisponible <= 0) {
        return
      }

      const porAncho = anchoDisponible / hoja.ancho
      const cabe = ajuste === 'hoja-entera' && altoDisponible > 0 ? Math.min(porAncho, altoDisponible / hoja.alto) : porAncho

      /* Nunca más grande que el original: ampliar una hoja solo la pixela. Acercarla es decisión de la persona. */
      encaje.current = Math.min(1, cabe)
      aplicar()
    }

    encajar()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observador = new ResizeObserver(encajar)
    observador.observe(contenedor)

    return () => observador.disconnect()
  }, [contenedorRef, pintada, ajuste, margen, aplicar])

  /*
    Control + rueda, como en Word o en el visor de PDF. Sin Control la rueda
    sigue recorriendo la hoja. El pellizco de un trackpad llega al navegador
    como rueda con `ctrlKey`, así que también funciona sin hacer nada aparte.

    El oyente se registra a mano y no con `onWheel`: React los registra como
    pasivos, y en uno pasivo `preventDefault` no impide que el navegador haga
    zoom de la página entera en vez de la hoja.
  */
  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!conRueda || !pintada || contenedor === null) {
      return
    }

    const alGirar = (evento: WheelEvent): void => {
      if (!evento.ctrlKey) {
        return
      }

      evento.preventDefault()
      const caja = contenedor.getBoundingClientRect()
      escalar(Math.exp(-evento.deltaY * SENSIBILIDAD_DE_LA_RUEDA), {
        x: evento.clientX - caja.left,
        y: evento.clientY - caja.top,
      })
    }

    contenedor.addEventListener('wheel', alGirar, { passive: false })
    return () => contenedor.removeEventListener('wheel', alGirar)
  }, [contenedorRef, conRueda, pintada, escalar])

  return { zoom, escalar, ajustar }
}
