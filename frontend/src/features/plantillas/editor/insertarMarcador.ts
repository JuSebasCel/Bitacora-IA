import type { Editor } from '@tiptap/core'
import type { FormatoDeMarcador, ModoDeSeccion, OrigenDeMarcador } from '../data'
import { attrsDesdeOrigen } from './extensiones'

/*
  Punto único de inserción de un marcador, usado tanto por el clic en la
  paleta (inserta en la posición del cursor) como por soltar un chip
  arrastrado sobre el documento (inserta en la posición real bajo el
  puntero) — `posicionDesdeCoordenadas` es lo que hace que el segundo caso
  sea "verdadero" drag-and-drop y no una lista de botones con otro nombre.
*/
export function insertarMarcador(
  editor: Editor,
  origen: OrigenDeMarcador,
  formato: FormatoDeMarcador = 'parrafo',
  posicion?: number,
): void {
  const attrs = { ...attrsDesdeOrigen(origen), formato }
  const cadena = editor.chain().focus()

  if (typeof posicion === 'number') {
    cadena.insertContentAt(posicion, { type: 'marcador', attrs }).run()
  } else {
    cadena.insertContent({ type: 'marcador', attrs }).run()
  }
}

export function posicionDesdeCoordenadas(editor: Editor, clientX: number, clientY: number): number | null {
  const resultado = editor.view.posAtCoords({ left: clientX, top: clientY })
  return resultado?.pos ?? null
}

/** Envuelve la selección actual en una sección condicional/repetible; vuelve a llamarse para quitarla. */
export function alternarSeccion(editor: Editor, modo: ModoDeSeccion, origen: OrigenDeMarcador): void {
  editor
    .chain()
    .focus()
    .toggleWrap('seccionMarcador', { ...attrsDesdeOrigen(origen), modo })
    .run()
}
