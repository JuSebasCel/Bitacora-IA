import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { renderAsync } from 'docx-preview'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'

export type PropsMiniaturaDeDocx = {
  archivoOriginal: string
}

/*
  Miniatura de la tarjeta del listado para una plantilla `.docx`: el mismo
  `docx-preview` que usa la pantalla de confirmación, recortado dentro de una
  caja de altura fija y escalado hacia abajo — mismo principio que la
  miniatura TipTap de una plantilla en blanco (`TarjetaDePlantillaEnBlanco`
  en `TarjetaDePlantilla.tsx`), aplicado aquí al documento real en vez de a
  un documento editable. Mientras carga, o si el renderizado falla, se ve un
  ícono de respaldo en vez de dejar la tarjeta en blanco.
*/
export function MiniaturaDeDocx({ archivoOriginal }: PropsMiniaturaDeDocx): ReactElement {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let cancelado = false
    setListo(false)

    const contenedor = contenedorRef.current
    if (contenedor === null) {
      return
    }

    contenedor.innerHTML = ''

    fetch(archivoOriginal)
      .then((respuesta) => respuesta.blob())
      .then((blob) => renderAsync(blob, contenedor, undefined, { inWrapper: true }))
      .then(() => {
        if (!cancelado) {
          setListo(true)
        }
      })
      .catch(() => {
        /* se deja el ícono de respaldo visible */
      })

    return () => {
      cancelado = true
    }
  }, [archivoOriginal])

  return (
    <div className="relative h-full w-full">
      {listo ? null : (
        <div className="absolute inset-0 flex items-center justify-center text-texto-tenue">
          <FileTextIcon size={32} weight="light" aria-hidden="true" />
        </div>
      )}
      <div
        ref={contenedorRef}
        aria-hidden="true"
        className="vista-previa-docx pointer-events-none h-full w-[250%] origin-top-left scale-[0.4]"
      />
    </div>
  )
}
