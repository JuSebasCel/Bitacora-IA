import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import type { ReactElement } from 'react'
import { Button, Popover, Select } from '@/shared/ui'
import { ETIQUETAS_DE_FORMATO, etiquetaDeOrigen, resolverMarcador } from '../../data'
import type { FormatoDeMarcador } from '../../data'
import { SelectorDeOrigen } from './SelectorDeOrigen'
import { attrsDesdeOrigen, origenDesdeAttrs } from './origen'
import type { AttrsDeOrigen } from './origen'

export type AttrsDeMarcador = AttrsDeOrigen & { readonly formato: FormatoDeMarcador }

const OPCIONES_DE_FORMATO = Object.entries(ETIQUETAS_DE_FORMATO).map(([valor, texto]) => ({ valor, texto }))

/*
  Chip de marcador: nodo atómico en línea, editado con un popover propio (no
  hay un inspector lateral aparte como en la v1 de lienzo libre — cada
  marcador se edita donde vive, en el propio flujo del texto). En modo
  lectura (miniatura de tarjeta) se pinta sin controles interactivos.
*/
function ChipMarcador({ node, updateAttributes, deleteNode, editor }: NodeViewProps): ReactElement {
  const attrs = node.attrs as AttrsDeMarcador
  const origen = origenDesdeAttrs(attrs)
  const etiqueta = etiquetaDeOrigen(origen)
  const resuelto = resolverMarcador(origen, attrs.formato)
  const texto = Array.isArray(resuelto) ? resuelto.join(' · ') : resuelto

  if (!editor.isEditable) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        className="rounded border border-dashed border-acento/50 bg-acento-tenue px-1.5 py-0.5 text-[0.85em] text-acento italic"
      >
        {etiqueta}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper contentEditable={false} className="inline-block align-baseline">
      <Popover
        etiquetaAccesible={`Editar marcador ${etiqueta}`}
        boton={
          <span className="inline-flex max-w-[22rem] items-center gap-1 rounded border border-dashed border-acento/60 bg-acento-tenue px-1.5 py-0.5 text-[0.85em] font-medium text-acento">
            <TagIcon size={11} weight="bold" aria-hidden="true" />
            <span className="truncate">{etiqueta}</span>
            <span className="truncate font-normal text-acento/70 italic">· {texto}</span>
          </span>
        }
      >
        {(cerrar) => (
          <div className="flex flex-col gap-3">
            <SelectorDeOrigen
              idBase={`marcador-${String(attrs.campo ?? attrs.etiquetaPersonalizada ?? 'nuevo')}`}
              origen={origen}
              alCambiar={(nuevoOrigen) => updateAttributes(attrsDesdeOrigen(nuevoOrigen))}
            />

            <Select
              aria-label="Formato del marcador"
              opciones={OPCIONES_DE_FORMATO}
              value={attrs.formato}
              onChange={(evento) => updateAttributes({ formato: evento.target.value as FormatoDeMarcador })}
            />

            <Button
              variante="sutil"
              onClick={() => {
                deleteNode()
                cerrar()
              }}
            >
              <TrashIcon size={13} weight="regular" aria-hidden="true" />
              Quitar marcador
            </Button>
          </div>
        )}
      </Popover>
    </NodeViewWrapper>
  )
}

export const NodoMarcador = Node.create({
  name: 'marcador',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      origenTipo: { default: 'campo' },
      campo: { default: 'tema_principal' },
      etiquetaPersonalizada: { default: null },
      formato: { default: 'parrafo' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-marcador]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const etiqueta = etiquetaDeOrigen(origenDesdeAttrs(node.attrs as AttrsDeOrigen))
    return ['span', mergeAttributes(HTMLAttributes, { 'data-marcador': '' }), etiqueta]
  },

  addNodeView() {
    /*
      Sin `stopEvent`, un clic sobre el botón del popover también llega al
      manejador propio de ProseMirror para nodos atómicos ("seleccionar este
      nodo como hoja"), que en ciertos casos construye su transacción de
      selección contra un documento que ya cambió por el propio re-render de
      React del popover — `RangeError: Selection passed to setSelection must
      point at the current document`. El chip no necesita el gesto de
      selección nativo de ProseMirror: toda la interacción (abrir el
      popover, editar, quitar) ya la maneja React, así que se le indica a
      ProseMirror que ignore por completo los eventos de puntero sobre este
      nodo. Encontrado en la revisión visual (clic real de Playwright), no en
      ninguna prueba.
    */
    return ReactNodeViewRenderer(ChipMarcador, { stopEvent: () => true })
  },
})
