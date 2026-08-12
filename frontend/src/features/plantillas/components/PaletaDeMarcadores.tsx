import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag'
import type { Editor } from '@tiptap/core'
import type { DragEvent, ReactElement } from 'react'
import { useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { Button, Input } from '@/shared/ui'
import { TEXTO_ERROR } from '@/shared/ui/clases'
import { CAMPOS_DE_MARCADOR, ETIQUETAS_DE_CAMPO } from '../data'
import type { OrigenDeMarcador } from '../data'
import { insertarMarcador } from '../editor/insertarMarcador'

/** Tipo MIME propio usado en `dataTransfer` al arrastrar un chip hacia el documento. */
export const FORMATO_MIME_MARCADOR = 'application/x-bitacora-marcador'

export type PropsPaletaDeMarcadores = {
  editor: Editor | null
}

/*
  Panel lateral con los campos disponibles: los cinco fijos del repositorio,
  más los personalizados que se vayan definiendo en esta sesión de edición
  (texto libre, como los placeholders reales de `.agent/examples/tem.docx`).
  Cada chip es arrastrable de verdad (`draggable` + `dataTransfer`, leído por
  `PantallaEditorDePlantilla` en el `onDrop` del documento) y también se
  puede insertar con un clic, para quien prefiera no arrastrar.
*/
export function PaletaDeMarcadores({ editor }: PropsPaletaDeMarcadores): ReactElement {
  const [personalizados, setPersonalizados] = useState<readonly string[]>([])
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('')
  const [error, setError] = useState<string | null>(null)

  const origenes: readonly OrigenDeMarcador[] = [
    ...CAMPOS_DE_MARCADOR.map((campo): OrigenDeMarcador => ({ tipo: 'campo', campo })),
    ...personalizados.map((etiqueta): OrigenDeMarcador => ({ tipo: 'personalizado', etiqueta })),
  ]

  function alArrastrar(evento: DragEvent<HTMLButtonElement>, origen: OrigenDeMarcador): void {
    evento.dataTransfer.setData(FORMATO_MIME_MARCADOR, JSON.stringify(origen))
    evento.dataTransfer.effectAllowed = 'copy'
  }

  function agregarPersonalizado(): void {
    const limpio = nuevaEtiqueta.trim()

    if (limpio.length === 0) {
      setError(mensajeDeError('PLANT_ETIQUETA_REQUERIDA'))
      return
    }

    setError(null)
    setPersonalizados((anteriores) => (anteriores.includes(limpio) ? anteriores : [...anteriores, limpio]))
    setNuevaEtiqueta('')
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-filete bg-panel p-4">
      <div>
        <h2 className="text-sm font-semibold text-texto">Campos</h2>
        <p className="mt-1 text-xs text-texto-tenue">
          Arrastra un campo hacia el documento, o haz clic para insertarlo donde esté el cursor.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Campos disponibles">
        {origenes.map((origen) => {
          const etiqueta = origen.tipo === 'campo' ? ETIQUETAS_DE_CAMPO[origen.campo] : origen.etiqueta
          const clave = origen.tipo === 'campo' ? origen.campo : `personalizado-${origen.etiqueta}`

          return (
            <li key={clave}>
              <button
                type="button"
                draggable={editor !== null}
                onDragStart={(evento) => alArrastrar(evento, origen)}
                onClick={() => editor !== null && insertarMarcador(editor, origen)}
                className="inline-flex cursor-grab items-center gap-1.5 rounded-md border border-filete-fuerte bg-fondo px-2.5 py-1.5 text-xs font-medium text-texto transition-colors hover:border-acento hover:text-acento active:cursor-grabbing"
              >
                <TagIcon size={12} weight="bold" aria-hidden="true" />
                {etiqueta}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2 border-t border-filete pt-3">
        <label htmlFor="paleta-campo-personalizado" className="text-xs font-medium text-texto-tenue">
          Campo personalizado
        </label>
        <div className="flex gap-2">
          <Input
            id="paleta-campo-personalizado"
            value={nuevaEtiqueta}
            placeholder="ej. Puntos de la agenda"
            onChange={(evento) => setNuevaEtiqueta(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                evento.preventDefault()
                agregarPersonalizado()
              }
            }}
          />
          <Button variante="secundario" onClick={agregarPersonalizado} aria-label="Agregar campo personalizado">
            <PlusIcon size={13} weight="bold" aria-hidden="true" />
          </Button>
        </div>
        {error === null ? null : <p role="alert" className={`text-xs font-medium ${TEXTO_ERROR}`}>{error}</p>}
      </div>
    </div>
  )
}
