import { GitBranchIcon } from '@phosphor-icons/react/dist/csr/GitBranch'
import { ImageIcon } from '@phosphor-icons/react/dist/csr/Image'
import { ListBulletsIcon } from '@phosphor-icons/react/dist/csr/ListBullets'
import { ListNumbersIcon } from '@phosphor-icons/react/dist/csr/ListNumbers'
import { RepeatIcon } from '@phosphor-icons/react/dist/csr/Repeat'
import { TextAlignCenterIcon } from '@phosphor-icons/react/dist/csr/TextAlignCenter'
import { TextAlignLeftIcon } from '@phosphor-icons/react/dist/csr/TextAlignLeft'
import { TextAlignRightIcon } from '@phosphor-icons/react/dist/csr/TextAlignRight'
import { TextBIcon } from '@phosphor-icons/react/dist/csr/TextB'
import { TextHOneIcon } from '@phosphor-icons/react/dist/csr/TextHOne'
import { TextHTwoIcon } from '@phosphor-icons/react/dist/csr/TextHTwo'
import { TextItalicIcon } from '@phosphor-icons/react/dist/csr/TextItalic'
import type { Editor } from '@tiptap/core'
import type { ChangeEvent, ReactElement, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { Button, MensajeDeFormulario, Popover } from '@/shared/ui'
import { unirClases } from '@/shared/ui/clases'
import type { OrigenDeMarcador } from '../data'
import { SelectorDeOrigen } from '../editor/extensiones/SelectorDeOrigen'
import { alternarSeccion } from '../editor/insertarMarcador'
import { validarImagen } from '../plantillas'

export type PropsBarraDeHerramientas = {
  editor: Editor | null
}

type PropsBotonDeFormato = {
  activo: boolean
  onClick: () => void
  etiqueta: string
  children: ReactNode
}

function BotonDeFormato({ activo, onClick, etiqueta, children }: PropsBotonDeFormato): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={activo}
      className={unirClases(
        'inline-flex size-8 items-center justify-center rounded-md border transition-colors',
        activo
          ? 'border-acento bg-acento-tenue text-acento'
          : 'border-transparent text-texto-tenue hover:border-filete-fuerte hover:text-texto',
      )}
    >
      {children}
    </button>
  )
}

function Separador(): ReactElement {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-filete-fuerte" />
}

const ID_ERROR = 'barra-herramientas-error'

/*
  Barra de herramientas tipo Word: negrita/cursiva, título/subtítulo, listas
  con viñetas/numeradas e imagen, más los dos controles propios del dominio
  (sección condicional/repetible), que envuelven la selección actual —
  necesitan un origen (campo o etiqueta), así que cada uno abre un popover
  con `SelectorDeOrigen` en vez de aplicar directo como el resto de botones.
*/
export function BarraDeHerramientas({ editor }: PropsBarraDeHerramientas): ReactElement {
  const refInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [origenSeccion, setOrigenSeccion] = useState<OrigenDeMarcador>({
    tipo: 'campo',
    campo: 'tema_principal',
  })

  function alElegirImagen(evento: ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0] ?? null
    evento.target.value = ''

    if (archivo === null || editor === null) {
      return
    }

    const resultado = validarImagen(archivo)
    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    setError(null)

    const lector = new FileReader()
    lector.onload = () => {
      if (typeof lector.result === 'string') {
        editor.chain().focus().setImage({ src: lector.result }).run()
      }
    }
    lector.readAsDataURL(archivo)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-filete bg-panel p-1.5">
        <BotonDeFormato
          etiqueta="Negrita"
          activo={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <TextBIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <BotonDeFormato
          etiqueta="Cursiva"
          activo={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <TextItalicIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>

        <Separador />

        <BotonDeFormato
          etiqueta="Título"
          activo={editor?.isActive('heading', { level: 1 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <TextHOneIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <BotonDeFormato
          etiqueta="Subtítulo"
          activo={editor?.isActive('heading', { level: 2 }) ?? false}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <TextHTwoIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>

        <Separador />

        <BotonDeFormato
          etiqueta="Alinear a la izquierda"
          activo={editor?.isActive({ textAlign: 'left' }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <TextAlignLeftIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <BotonDeFormato
          etiqueta="Centrar"
          activo={editor?.isActive({ textAlign: 'center' }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <TextAlignCenterIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <BotonDeFormato
          etiqueta="Alinear a la derecha"
          activo={editor?.isActive({ textAlign: 'right' }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <TextAlignRightIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>

        <Separador />

        <BotonDeFormato
          etiqueta="Lista con viñetas"
          activo={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListBulletsIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <BotonDeFormato
          etiqueta="Lista numerada"
          activo={editor?.isActive('orderedList') ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbersIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>

        <Separador />

        <BotonDeFormato etiqueta="Insertar imagen" activo={false} onClick={() => refInput.current?.click()}>
          <ImageIcon size={15} weight="bold" aria-hidden="true" />
        </BotonDeFormato>
        <input
          ref={refInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={alElegirImagen}
          className="hidden"
        />

        <Separador />

        <Popover
          etiquetaAccesible="Marcar selección como sección condicional"
          boton={
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <GitBranchIcon size={14} weight="bold" aria-hidden="true" />
              Condicional
            </span>
          }
        >
          {(cerrar) => (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-texto-tenue">
                Envuelve el texto seleccionado: se omite por completo si el dato no existe.
              </p>
              <SelectorDeOrigen idBase="seccion-condicional" origen={origenSeccion} alCambiar={setOrigenSeccion} />
              <Button
                onClick={() => {
                  if (editor !== null) {
                    alternarSeccion(editor, 'condicional', origenSeccion)
                  }
                  cerrar()
                }}
              >
                Aplicar
              </Button>
            </div>
          )}
        </Popover>

        <Popover
          etiquetaAccesible="Marcar selección como sección repetible"
          boton={
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <RepeatIcon size={14} weight="bold" aria-hidden="true" />
              Repetible
            </span>
          }
        >
          {(cerrar) => (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-texto-tenue">
                Envuelve el texto seleccionado: se repite una vez por cada dato disponible.
              </p>
              <SelectorDeOrigen idBase="seccion-repetible" origen={origenSeccion} alCambiar={setOrigenSeccion} />
              <Button
                onClick={() => {
                  if (editor !== null) {
                    alternarSeccion(editor, 'repetible', origenSeccion)
                  }
                  cerrar()
                }}
              >
                Aplicar
              </Button>
            </div>
          )}
        </Popover>
      </div>

      {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}
    </div>
  )
}
