import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { useEditor } from '@tiptap/react'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { EditorDeDocumento, VistaPreviaDeDocx } from '@/features/plantillas/components'
import { EXTENSIONES_DE_PLANTILLA } from '@/features/plantillas/editor/extensionesDePlantilla'
import type { ResultadoDeMemoria } from '../generarMemoria'

export type PropsVistaPreviaDeMemoria = {
  resultado: ResultadoDeMemoria
  /** Nombre de la memoria, usado para el archivo de descarga cuando el origen es `.docx`. */
  nombre: string
}

function VistaPreviaDocx({ blob, nombre }: { blob: Blob; nombre: string }): ReactElement {
  const [urlDeDescarga, setUrlDeDescarga] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setUrlDeDescarga(url)

    return () => URL.revokeObjectURL(url)
  }, [blob])

  return (
    <div className="flex flex-col gap-4">
      {urlDeDescarga === null ? null : (
        <a
          href={urlDeDescarga}
          download={`${nombre.trim().length > 0 ? nombre : 'memoria'}.docx`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-acento hover:underline"
        >
          <DownloadSimpleIcon size={14} weight="bold" aria-hidden="true" />
          Descargar memoria
        </a>
      )}

      <VistaPreviaDeDocx blob={blob} />
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

/**
 * Vista previa de una memoria ya generada (F5): reutiliza `VistaPreviaDeDocx`
 * para el origen `.docx` (con descarga real del archivo generado) y un
 * editor TipTap de solo lectura para el origen `blanco` (sin descarga — no
 * existe todavía un exportador de ese origen a un archivo real, ver el plan
 * del módulo).
 */
export function VistaPreviaDeMemoria({ resultado, nombre }: PropsVistaPreviaDeMemoria): ReactElement {
  return resultado.origen === 'docx' ? (
    <VistaPreviaDocx blob={resultado.blob} nombre={nombre} />
  ) : (
    <VistaPreviaBlanco contenido={resultado} />
  )
}
