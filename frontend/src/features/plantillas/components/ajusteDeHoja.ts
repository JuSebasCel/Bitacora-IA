import { useEffect } from 'react'
import type { RefObject } from 'react'

/*
  Encaja la hoja que pinta `docx-preview` en el espacio que tiene.

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
*/
export type AjusteDeHoja = 'ancho' | 'hoja-entera'

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

export function useAjusteDeHoja(
  contenedorRef: RefObject<HTMLElement | null>,
  pintada: boolean,
  ajuste: AjusteDeHoja,
  /* Aire alrededor de la hoja, en píxeles de pantalla. */
  margen = 0,
): void {
  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!pintada || contenedor === null) {
      return
    }

    const encajar = (): void => {
      const envoltura = contenedor.querySelector<HTMLElement>('.docx-wrapper')
      const hoja = medidasDeHoja(contenedor)
      if (envoltura === null || hoja === null) {
        return
      }

      const anchoDisponible = contenedor.clientWidth - margen * 2
      const altoDisponible = contenedor.clientHeight - margen * 2
      if (anchoDisponible <= 0) {
        return
      }

      const porAncho = anchoDisponible / hoja.ancho
      const zoom = ajuste === 'hoja-entera' && altoDisponible > 0 ? Math.min(porAncho, altoDisponible / hoja.alto) : porAncho

      /* Nunca más grande que el original: ampliar una hoja solo la pixela. */
      envoltura.style.zoom = String(Math.min(1, zoom))
    }

    encajar()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observador = new ResizeObserver(encajar)
    observador.observe(contenedor)

    return () => observador.disconnect()
  }, [contenedorRef, pintada, ajuste, margen])
}
