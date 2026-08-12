import { renderAsync } from 'docx-preview'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

export type PropsVistaPreviaDeDocx = {
  blob: Blob | null
}

/*
  Renderiza el `.docx` generado (con los datos de ejemplo ya sustituidos)
  como HTML de solo lectura, fiel al original — no es el editor, no permite
  tocar nada aquí. Si `docx-preview` no logra renderizarlo, se degrada a un
  aviso: la descarga del archivo generado sigue disponible en la pantalla
  que monta este componente, así que nunca es la única salida.
*/
export function VistaPreviaDeDocx({ blob }: PropsVistaPreviaDeDocx): ReactElement | null {
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
    renderAsync(blob, contenedor, undefined, { inWrapper: true }).catch(() => {
      setFallo(true)
    })
  }, [blob])

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
