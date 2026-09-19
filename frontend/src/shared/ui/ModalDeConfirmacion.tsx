import { useState } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import { Modal } from './Modal'

/*
  Confirmar algo que no se puede deshacer.

  **Dice qué se pierde, no "¿estás seguro?".** Esa pregunta no aporta
  información: quien la lee ya sabe que pulsó borrar. Lo que no sabe es el
  alcance — que borrar una conferencia se lleva sus fichas, y con ellas el
  análisis que ya se pagó. Por eso `consecuencias` es obligatorio.

  El botón que destruye va a la derecha y en rojo, y el de cancelar queda
  enfocado al abrir: si alguien llegó aquí por error, la tecla de espacio no
  borra nada.
*/

export type PropsModalDeConfirmacion = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  /** Qué deja de existir exactamente. Va en la propia lista, sin adornos. */
  consecuencias: readonly string[]
  /** El texto del botón que destruye. Nombra la acción, no dice "Aceptar". */
  accion: string
  alConfirmar: () => void | Promise<void>
  children?: ReactNode
  anclaEn?: RefObject<HTMLElement | null>
  limites?: RefObject<HTMLElement | null>
}

export function ModalDeConfirmacion({
  abierto,
  alCerrar,
  titulo,
  consecuencias,
  accion,
  alConfirmar,
  children,
  anclaEn,
  limites,
}: PropsModalDeConfirmacion): ReactElement {
  const [ocupado, setOcupado] = useState(false)

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={titulo}
      ancho="angosto"
      {...(anclaEn === undefined ? {} : { anclaje: 'disparador' as const, anclaEn })}
      {...(limites === undefined ? {} : { limites })}
    >
      {children}

      <div className="flex flex-col gap-2 rounded-[20px] bg-fondo px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-error-borde)]">
        <p className="text-sm font-medium text-texto">Esto no se puede deshacer:</p>
        <ul className="flex flex-col gap-1">
          {consecuencias.map((consecuencia) => (
            <li key={consecuencia} className="flex items-start gap-2 text-sm text-texto-tenue">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-texto-tenue" />
              {consecuencia}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        {/* Enfocado al abrir: si se llegó aquí por error, la barra espaciadora no borra. */}
        <button
          autoFocus
          type="button"
          onClick={alCerrar}
          className="h-11 cursor-pointer rounded-full px-5 text-base text-texto transition-colors hover:bg-acento-tenue"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setOcupado(true)
            void Promise.resolve(alConfirmar()).finally(() => setOcupado(false))
          }}
          className="h-11 cursor-pointer rounded-full bg-error px-5 text-base font-medium text-acento-contraste transition-opacity disabled:cursor-default disabled:opacity-60"
        >
          {ocupado ? 'Borrando…' : accion}
        </button>
      </div>
    </Modal>
  )
}
