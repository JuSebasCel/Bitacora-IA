import { renderAsync } from 'docx-preview'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

export type PropsVistaPreviaDeDocx = {
  blob: Blob | null
  /** Resaltar los `[[marcadores]]` dentro de la hoja. Para configurar una plantilla, no para ver una memoria. */
  resaltarMarcadores?: boolean
}

const NOMBRE_DEL_RESALTE = 'marcadores-de-plantilla'

/*
  Resalta cada `[[marcador]]` de la hoja ya pintada, sin tocarla.

  No se envuelve el texto en un `<mark>`: `docx-preview` pinta cada tramo de
  formato de Word como un `<span>` aparte, y un marcador que Word partió en
  tres —pasa, al corregir una letra— vive en tres nodos distintos que ningún
  elemento puede envolver sin romper los de alrededor. La API de resaltado del
  navegador trabaja sobre rangos, que sí pueden cruzar nodos: se busca en el
  texto de todos seguidos y se traduce cada coincidencia a su rango.

  Donde no existe la API (navegadores viejos) simplemente no se resalta: la
  hoja se sigue viendo igual y los marcadores siguen en la columna de al lado.
*/
function resaltarMarcadoresEn(contenedor: HTMLElement): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS) || typeof Highlight === 'undefined') {
    return
  }

  const nodos: Text[] = []
  const inicios: number[] = []
  let texto = ''

  const recorrido = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT)
  while (recorrido.nextNode()) {
    const nodo = recorrido.currentNode as Text
    inicios.push(texto.length)
    nodos.push(nodo)
    texto += nodo.data
  }

  /* El nodo donde cae una posición del texto corrido, y su desplazamiento dentro de él. */
  function ubicar(posicion: number, esFinal: boolean): [Text, number] | null {
    for (let indice = nodos.length - 1; indice >= 0; indice -= 1) {
      const inicio = inicios[indice] ?? 0
      if (esFinal ? inicio < posicion : inicio <= posicion) {
        const nodo = nodos[indice]
        return nodo === undefined ? null : [nodo, posicion - inicio]
      }
    }
    return null
  }

  const rangos: Range[] = []

  for (const coincidencia of texto.matchAll(/\[\[[^[\]]+\]\]/g)) {
    const inicio = ubicar(coincidencia.index, false)
    const fin = ubicar(coincidencia.index + coincidencia[0].length, true)

    if (inicio !== null && fin !== null) {
      const rango = new Range()
      rango.setStart(inicio[0], inicio[1])
      rango.setEnd(fin[0], fin[1])
      rangos.push(rango)
    }
  }

  CSS.highlights.set(NOMBRE_DEL_RESALTE, new Highlight(...rangos))
}

/*
  Renderiza el `.docx` generado (con los datos de ejemplo ya sustituidos)
  como HTML de solo lectura, fiel al original — no es el editor, no permite
  tocar nada aquí. Si `docx-preview` no logra renderizarlo, se degrada a un
  aviso: la descarga del archivo generado sigue disponible en la pantalla
  que monta este componente, así que nunca es la única salida.
*/
export function VistaPreviaDeDocx({ blob, resaltarMarcadores = false }: PropsVistaPreviaDeDocx): ReactElement | null {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (blob === null || contenedor === null) {
      return
    }

    setFallo(false)
    contenedor.innerHTML = ''

    /*
      `inWrapper: false` parecía más simple (sin un div extra), pero
      apagaba de paso el centrado y el fondo blanco de página que trae
      `docx-preview` por defecto (`.docx-wrapper { display:flex;
      align-items:center }` + `.docx-wrapper>section.docx { background:
      white }` — ver `styles/index.css`, donde se sobreescribe el gris fijo
      de la librería por los tokens del sistema). Sin el wrapper, la página
      queda transparente y pegada al borde izquierdo — la causa real del
      "no se ve centrada, fondo negro" que reportó el usuario.
    */
    renderAsync(blob, contenedor, undefined, { inWrapper: true })
      .then(() => {
        if (resaltarMarcadores) {
          resaltarMarcadoresEn(contenedor)
        }
      })
      .catch(() => {
        setFallo(true)
      })

    return () => {
      if (resaltarMarcadores && typeof CSS !== 'undefined' && 'highlights' in CSS) {
        CSS.highlights.delete(NOMBRE_DEL_RESALTE)
      }
    }
  }, [blob, resaltarMarcadores])

  if (blob === null) {
    return null
  }

  if (fallo) {
    return (
      <p className="text-sm text-texto-tenue">
        No pudimos mostrar la vista previa dentro de la página. Descarga el archivo generado para revisarlo en
        Word.
      </p>
    )
  }

  return (
    <div
      ref={contenedorRef}
      className="vista-previa-docx elevacion max-h-[70vh] overflow-auto rounded-sm border border-filete bg-fondo p-4"
    />
  )
}
