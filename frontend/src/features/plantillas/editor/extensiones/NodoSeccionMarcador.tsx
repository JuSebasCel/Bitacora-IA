import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import type { ReactElement } from 'react'
import { Button, Popover, Select } from '@/shared/ui'
import { unirClases } from '@/shared/ui/clases'
import { ETIQUETAS_DE_MODO_DE_SECCION, etiquetaDeOrigen } from '../../data'
import type { ModoDeSeccion } from '../../data'
import { SelectorDeOrigen } from './SelectorDeOrigen'
import { attrsDesdeOrigen, origenDesdeAttrs } from './origen'
import type { AttrsDeOrigen } from './origen'

export type AttrsDeSeccion = AttrsDeOrigen & { readonly modo: ModoDeSeccion }

const OPCIONES_DE_MODO = [
  { valor: 'condicional', texto: ETIQUETAS_DE_MODO_DE_SECCION.condicional },
  { valor: 'repetible', texto: ETIQUETAS_DE_MODO_DE_SECCION.repetible },
]

/*
  Sección condicional/repetible: envuelve un tramo de contenido en flujo
  (párrafos, listas, marcadores). El encabezado con la franja de color y el
  texto "Se omite si falta…"/"Se repite por cada…" solo aparece en modo
  edición; en la miniatura de tarjeta (no editable) el contenido se ve tal
  cual, sin la franja, para no ensuciar la vista previa.
*/
function SeccionMarcadorView({ node, updateAttributes, editor, getPos }: NodeViewProps): ReactElement {
  const attrs = node.attrs as AttrsDeSeccion
  const origen = origenDesdeAttrs(attrs)
  const etiqueta = etiquetaDeOrigen(origen)
  const esCondicional = attrs.modo === 'condicional'

  function quitarSeccion(): void {
    const posicion = getPos()
    if (typeof posicion !== 'number') {
      return
    }

    editor.chain().focus().setNodeSelection(posicion).lift('seccionMarcador').run()
  }

  return (
    <NodeViewWrapper
      className={unirClases(
        'my-2 rounded-md border-l-4 pl-3',
        esCondicional ? 'border-pendiente' : 'border-acento',
      )}
    >
      {editor.isEditable ? (
        <div contentEditable={false} className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={unirClases(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium',
              esCondicional ? 'bg-pendiente/15 text-pendiente' : 'bg-acento-tenue text-acento',
            )}
          >
            {esCondicional ? 'Se omite si falta' : 'Se repite por cada'} «{etiqueta}»
          </span>

          <Popover etiquetaAccesible={`Editar ${etiqueta}`} boton="Editar">
            {() => (
              <div className="flex flex-col gap-3">
                <Select
                  aria-label="Modo de la sección"
                  opciones={OPCIONES_DE_MODO}
                  value={attrs.modo}
                  onChange={(evento) => updateAttributes({ modo: evento.target.value as ModoDeSeccion })}
                />

                <SelectorDeOrigen
                  idBase={`seccion-${String(attrs.campo ?? attrs.etiquetaPersonalizada ?? 'nueva')}`}
                  origen={origen}
                  alCambiar={(nuevoOrigen) => updateAttributes(attrsDesdeOrigen(nuevoOrigen))}
                />
              </div>
            )}
          </Popover>

          <Button variante="sutil" onClick={quitarSeccion}>
            <TrashIcon size={13} weight="regular" aria-hidden="true" />
            Quitar sección
          </Button>
        </div>
      ) : null}

      <NodeViewContent className="flex flex-col gap-2" />
    </NodeViewWrapper>
  )
}

export const NodoSeccionMarcador = Node.create({
  name: 'seccionMarcador',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      modo: { default: 'condicional' },
      origenTipo: { default: 'campo' },
      campo: { default: 'tema_principal' },
      etiquetaPersonalizada: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-seccion-marcador]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-seccion-marcador': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SeccionMarcadorView)
  },
})
