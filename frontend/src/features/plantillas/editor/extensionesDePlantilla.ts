import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import StarterKit from '@tiptap/starter-kit'
import { NodoMarcador, NodoSeccionMarcador } from './extensiones'

/*
  Esquema del editor en blanco (`origen: 'blanco'`) — montado por
  `EditorDePlantillaInterno` y por la miniatura de tarjeta en modo lectura.
  Una plantilla `origen: 'docx'` no pasa por aquí: el archivo subido se
  conserva intacto y nunca se reconstruye como documento TipTap, ver
  `editor/importarDocx.ts`.
*/
export const EXTENSIONES_DE_PLANTILLA = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Image.configure({ inline: false, allowBase64: true }),
  Placeholder.configure({
    placeholder: 'Escribe aquí, o arrastra un campo desde la paleta.',
  }),
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
  NodoMarcador,
  NodoSeccionMarcador,
]
