import type { Editor } from '@tiptap/core'
import { EditorContent } from '@tiptap/react'
import type { ReactElement } from 'react'
import { unirClases } from '@/shared/ui/clases'

export type PropsEditorDeDocumento = {
  editor: Editor | null
  className?: string
}

/*
  La "hoja" del documento: una superficie clara y elevada (`bg-papel`), fija
  sin importar el tema de la app — igual que un documento real no invierte de
  color con el tema del sistema. Es lo que reemplaza el lienzo oscuro de la
  v1 (`LienzoDePlantilla` sobre `bg-panel`), que era justo la queja: "ese
  fondo negro". El resto del cromo (barra, paleta, fondo detrás de la hoja)
  sigue el tema claro/oscuro normal de la app.

  Quien monta este componente es dueño del `Editor` (vía `useEditor` en la
  pantalla o en `TarjetaDePlantilla`): este componente es solo la superficie
  visual, no crea ni destruye la instancia.
*/
export function EditorDeDocumento({ editor, className }: PropsEditorDeDocumento): ReactElement {
  return (
    <div
      className={unirClases(
        'elevacion prose-plantilla rounded-sm border border-filete bg-papel p-8 text-papel-texto sm:p-12',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}
