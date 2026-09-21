import { useEditor } from '@tiptap/react'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { EditorDeDocumento, VistaPreviaDeDocx } from '@/features/plantillas/components'
import { EXTENSIONES_DE_PLANTILLA } from '@/features/plantillas/editor/extensionesDePlantilla'
import { hayBackend } from '@/shared/api/backend'
import type { CodigoError } from '@/shared/errors'
import { mensajeDeError } from '@/shared/errors'
import type { ResultadoDeMemoria } from '../generarMemoria'
import { convertirAPdf } from '../redaccion'

export type PropsVistaPreviaDeMemoria = {
  resultado: ResultadoDeMemoria
  /** Nombre de la memoria, usado para los archivos de descarga. */
  nombre: string
}

/** Una URL de objeto para un `Blob`, revocada al cambiar o desmontar. */
function useUrlDe(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (blob === null) {
      setUrl(null)
      return
    }

    const nueva = URL.createObjectURL(blob)
    setUrl(nueva)

    return () => URL.revokeObjectURL(nueva)
  }, [blob])

  return url
}

type EstadoDelPdf =
  | { readonly tipo: 'convirtiendo' }
  | { readonly tipo: 'listo'; readonly pdf: Blob }
  | { readonly tipo: 'fallo'; readonly codigo: CodigoError }
  | { readonly tipo: 'sin-backend' }

/*
  La memoria se ve como el PDF que se descarga, no como una aproximación.

  El Word se convierte en el servidor (LibreOffice) y el PDF se enseña con el
  visor del propio navegador, que ya trae lo que se pidió —en qué página se
  está, miniaturas, zoom— sin añadir una librería. Y es el mismo archivo que
  baja el botón: lo que se ve es exactamente lo que se entrega.

  `docx-preview` no sirve aquí aunque ya esté instalado: solo conoce los saltos
  de página que Word dejó guardados en el archivo, y cuando la IA mete su texto
  el contenido crece pero no se vuelve a paginar. En la memoria generada, que
  es justo donde importa, su "página 2 de 4" mentiría.

  Si el PDF no sale, la memoria no se pierde: se cae a la vista del Word y su
  descarga, y se dice por qué.
*/
function VistaDeMemoriaDocx({ blob, nombre }: { blob: Blob; nombre: string }): ReactElement {
  const [estado, setEstado] = useState<EstadoDelPdf>(() =>
    hayBackend() ? { tipo: 'convirtiendo' } : { tipo: 'sin-backend' },
  )

  useEffect(() => {
    if (!hayBackend()) {
      setEstado({ tipo: 'sin-backend' })
      return
    }

    let cancelado = false
    setEstado({ tipo: 'convirtiendo' })

    void convertirAPdf(blob).then((resultado) => {
      if (!cancelado) {
        setEstado(resultado.ok ? { tipo: 'listo', pdf: resultado.datos } : { tipo: 'fallo', codigo: resultado.codigo })
      }
    })

    return () => {
      cancelado = true
    }
  }, [blob])

  const urlDelWord = useUrlDe(blob)
  const urlDelPdf = useUrlDe(estado.tipo === 'listo' ? estado.pdf : null)
  const base = nombre.trim().length > 0 ? nombre.trim() : 'memoria'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {urlDelPdf === null ? null : (
          <a
            href={urlDelPdf}
            download={`${base}.pdf`}
            className="flex h-10 items-center gap-2 rounded-full bg-acento px-4 text-sm font-medium text-acento-contraste transition-opacity hover:opacity-85"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
              picture_as_pdf
            </span>
            Descargar PDF
          </a>
        )}

        {urlDelWord === null ? null : (
          <a
            href={urlDelWord}
            download={`${base}.docx`}
            className="flex h-10 items-center gap-2 rounded-full bg-acento-tenue px-4 text-sm text-texto-tenue transition-colors hover:text-texto"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
              description
            </span>
            Descargar Word
          </a>
        )}

        {estado.tipo === 'convirtiendo' ? (
          <span className="flex items-center gap-2 px-2 text-sm text-texto-tenue">
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno animate-spin text-base">
              progress_activity
            </span>
            Preparando el PDF…
          </span>
        ) : null}
      </div>

      {estado.tipo === 'fallo' ? (
        <p role="status" className="text-sm text-texto-tenue">
          {mensajeDeError(estado.codigo)}
        </p>
      ) : null}

      <section aria-label="Vista previa de la memoria" className="flex min-h-[70vh] flex-1 flex-col rounded-[24px] bg-panel p-2">
        {urlDelPdf !== null ? (
          <iframe src={urlDelPdf} title={`Vista previa de ${base}`} className="min-h-[70vh] w-full flex-1 rounded-2xl" />
        ) : estado.tipo === 'convirtiendo' ? (
          /* Mientras llega el PDF se ve el Word: esperar con la hoja en blanco no tiene por qué. */
          <div className="sin-barra-de-scroll flex-1 overflow-y-auto rounded-2xl opacity-60">
            <VistaPreviaDeDocx blob={blob} />
          </div>
        ) : (
          <div className="sin-barra-de-scroll flex-1 overflow-y-auto rounded-2xl">
            <VistaPreviaDeDocx blob={blob} />
          </div>
        )}
      </section>
    </div>
  )
}

function VistaPreviaBlanco({ contenido }: { contenido: ResultadoDeMemoria & { origen: 'blanco' } }): ReactElement {
  const editor = useEditor({
    extensions: EXTENSIONES_DE_PLANTILLA,
    content: contenido.contenido,
    editable: false,
    immediatelyRender: false,
  })

  return <EditorDeDocumento editor={editor} />
}

export function VistaPreviaDeMemoria({ resultado, nombre }: PropsVistaPreviaDeMemoria): ReactElement {
  return resultado.origen === 'docx' ? (
    <VistaDeMemoriaDocx blob={resultado.blob} nombre={nombre} />
  ) : (
    <VistaPreviaBlanco contenido={resultado} />
  )
}
