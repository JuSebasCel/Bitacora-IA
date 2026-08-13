import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { Button } from '@/shared/ui'
import type { Conversacion } from '../data/tipos'

export type PropsListaDeConversaciones = {
  conversaciones: readonly Conversacion[]
  idActiva: string | null
  alSeleccionar: (id: string) => void
  alCrear: () => void
  alRenombrar: (id: string, titulo: string) => void
  alEliminar: (id: string) => void
}

/*
  Índice de conversaciones del panel de chat. Mismo patrón de "activo" que
  `BarraLateral.tsx`: un filete izquierdo de color de acento marca dónde
  está la persona, sin depender de un fondo sólido que compita con la burbuja
  de mensajes de al lado.

  Renombrar y eliminar viven aquí, no en la conversación abierta: son
  acciones sobre el índice (qué conversación es cuál), no sobre su
  contenido — mismo criterio que separar el título de una plantilla de su
  editor.
*/
export function ListaDeConversaciones({
  conversaciones,
  idActiva,
  alSeleccionar,
  alCrear,
  alRenombrar,
  alEliminar,
}: PropsListaDeConversaciones): ReactElement {
  const [idEnEdicion, setIdEnEdicion] = useState<string | null>(null)
  const [valorEditado, setValorEditado] = useState('')

  function empezarAEditar(conversacion: Conversacion): void {
    setIdEnEdicion(conversacion.id)
    setValorEditado(conversacion.titulo)
  }

  function confirmarEdicion(): void {
    if (idEnEdicion === null) {
      return
    }

    if (valorEditado.trim().length > 0) {
      alRenombrar(idEnEdicion, valorEditado)
    }

    setIdEnEdicion(null)
  }

  function eliminarConConfirmacion(conversacion: Conversacion): void {
    if (window.confirm(`¿Eliminar «${conversacion.titulo}»? Esta acción no se puede deshacer.`)) {
      alEliminar(conversacion.id)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <Button variante="secundario" onClick={alCrear} className="w-full">
        Nueva conversación
      </Button>

      {conversaciones.length === 0 ? (
        <p className="text-xs text-texto-tenue">Todavía no hay conversaciones. Crea una para empezar.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {conversaciones.map((conversacion) => {
            const activa = conversacion.id === idActiva
            const editando = conversacion.id === idEnEdicion

            if (editando) {
              return (
                <li key={conversacion.id} className="flex items-center gap-1 border-l-2 border-acento px-2 py-1">
                  <input
                    autoFocus
                    value={valorEditado}
                    onChange={(evento) => setValorEditado(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') confirmarEdicion()
                      if (evento.key === 'Escape') setIdEnEdicion(null)
                    }}
                    className="min-w-0 flex-1 rounded-md border border-filete bg-fondo px-2 py-1 text-sm text-texto focus:border-acento focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={confirmarEdicion}
                    aria-label="Guardar nombre"
                    className="rounded-md p-1 text-texto-tenue hover:bg-acento-tenue hover:text-acento"
                  >
                    <CheckIcon size={14} weight="bold" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdEnEdicion(null)}
                    aria-label="Cancelar"
                    className="rounded-md p-1 text-texto-tenue hover:bg-fondo"
                  >
                    <XIcon size={14} weight="bold" aria-hidden="true" />
                  </button>
                </li>
              )
            }

            const clases = activa
              ? 'border-acento bg-acento-tenue font-medium text-acento'
              : 'border-transparent text-texto-tenue hover:border-filete-fuerte hover:text-texto'

            return (
              <li key={conversacion.id} className={`group flex items-center rounded-md border-l-2 ${clases}`}>
                <button
                  type="button"
                  onClick={() => alSeleccionar(conversacion.id)}
                  aria-current={activa ? 'true' : undefined}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm"
                >
                  {conversacion.titulo}
                </button>

                <div className="flex shrink-0 items-center gap-0.5 pr-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => empezarAEditar(conversacion)}
                    aria-label={`Renombrar «${conversacion.titulo}»`}
                    className="rounded-md p-1 text-texto-tenue hover:bg-fondo hover:text-texto"
                  >
                    <PencilSimpleIcon size={13} weight="regular" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarConConfirmacion(conversacion)}
                    aria-label={`Eliminar «${conversacion.titulo}»`}
                    className="rounded-md p-1 text-texto-tenue hover:bg-error/12 hover:text-error"
                  >
                    <TrashIcon size={13} weight="regular" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
