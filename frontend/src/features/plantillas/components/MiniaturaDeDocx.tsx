import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { renderAsync } from 'docx-preview'
import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useAjusteDeHoja } from './ajusteDeHoja'

export type PropsMiniaturaDeDocx = {
  /** Bytes del `.docx` original, o `null` mientras se descargan del bucket o si la descarga falló. */
  archivo: Blob | null
  /** La descarga falló: en vez del esqueleto, el ícono de documento, porque no va a llegar nada. */
  fallida?: boolean
}

/*
  Miniatura de la tarjeta del listado para una plantilla `.docx`: el mismo
  `docx-preview` que usa la pantalla de confirmación, recortado dentro de una
  caja de altura fija y escalado hacia abajo. Mientras carga, o si el
  renderizado falla, se ve un ícono de respaldo en vez de dejar la tarjeta en
  blanco.

  Recibe los bytes ya resueltos en vez de ir a buscarlos: desde B6 el archivo
  se descarga del bucket (`useDocxDePlantilla`), y quien monta la tarjeta es
  quien sabe si esa descarga vale la pena. Así este componente sigue siendo
  puramente visual y su prueba no necesita simular red de ninguna clase.
*/
export function MiniaturaDeDocx({ archivo, fallida = false }: PropsMiniaturaDeDocx): ReactElement {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [listo, setListo] = useState(false)
  const [ilegible, setIlegible] = useState(false)
  const { zoom } = useAjusteDeHoja(contenedorRef, listo, 'hoja-entera')
  /*
    La hoja no se enseña hasta estar encajada. `docx-preview` la pinta a
    tamaño real y el encaje llega un cuadro después: enseñarla en cuanto
    se pintaba era ver una página gigante recortada que de golpe se
    encogía, cada vez que se volvía a la galería. Mientras, el barrido de
    carga de la app ocupa su sitio, y la hoja entra con un fundido.
  */
  const visible = listo && zoom !== null

  useEffect(() => {
    let cancelado = false
    setListo(false)
    setIlegible(false)

    const contenedor = contenedorRef.current
    if (contenedor === null) {
      return
    }

    contenedor.innerHTML = ''

    if (archivo === null) {
      return
    }

    renderAsync(archivo, contenedor, undefined, { inWrapper: true })
      .then(() => {
        if (!cancelado) {
          setListo(true)
        }
      })
      .catch(() => {
        if (!cancelado) {
          setIlegible(true)
        }
      })

    return () => {
      cancelado = true
    }
  }, [archivo])

  return (
    <div className="relative h-full w-full">
      {visible ? null : fallida || ilegible ? (
        <div className="absolute inset-0 flex items-center justify-center text-texto-tenue">
          <FileTextIcon size={32} weight="light" aria-hidden="true" />
        </div>
      ) : (
        <div aria-hidden="true" className="barrido-de-carga absolute inset-0 overflow-hidden bg-acento-tenue" />
      )}
      <div
        ref={contenedorRef}
        aria-hidden="true"
        className={`vista-previa-docx miniatura-docx pointer-events-none h-full w-full transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
