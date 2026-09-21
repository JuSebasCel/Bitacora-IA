import type { ReactElement } from 'react'

/*
  El chat, todavía sin funcionar, con la forma que va a tener.

  La composición es la de la referencia que dio el usuario: una tarjeta
  alta, los botones de cerrar y de conversación nueva arriba a la
  izquierda, y abajo el campo de escribir con el micrófono y el de enviar
  apilados a la derecha. Es un modelado: los controles están, pero
  deshabilitados, y en medio se dice que se está trabajando en él. Así, cuando
  el chat esté listo, lo que cambia es lo que hacen los botones, no la
  pantalla que ya se conoce.

  Los colores no son los de la referencia: su degradado morado con grano
  se probó y se descartó, porque traía una paleta que la app no tiene. La
  tarjeta es el acento de la app (`ilustracion`, el azul suave de cada
  tema) con su texto hondo del mismo matiz, y los botones son el negro o
  blanco de máximo contraste, igual que cualquier acción principal: así se
  leen bien en claro y en oscuro sin inventar otro color.
*/

const BOTON_REDONDO =
  'flex shrink-0 items-center justify-center rounded-full bg-acento text-acento-contraste transition-opacity disabled:cursor-not-allowed'

export function ChatEnCamino({ alCerrar }: { alCerrar: () => void }): ReactElement {
  return (
    <div className="relative flex h-[min(48rem,calc(100dvh-2rem))] w-full flex-col overflow-hidden rounded-[32px] bg-ilustracion text-ilustracion-texto">
      <div className="relative flex gap-2 p-5">
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className={`${BOTON_REDONDO} size-12 cursor-pointer hover:opacity-85`}
        >
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-2xl">
            close
          </span>
        </button>

        <button type="button" disabled aria-label="Conversación nueva" className={`${BOTON_REDONDO} size-12`}>
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-2xl">
            add_comment
          </span>
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
        <span className="flex items-center gap-2 rounded-full bg-fondo px-4 py-1.5 text-sm font-medium text-texto">
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-texto" />
          Estamos trabajando en el chat
        </span>
        <p className="max-w-xs text-base leading-relaxed">
          Vas a poder preguntarle a tus conferencias lo que se dijo en ellas, y recibir la respuesta con las fichas de
          donde sale.
        </p>
      </div>

      <div className="relative flex items-end gap-3 p-5">
        <label className="min-w-0 flex-1 pb-3 pl-3">
          <span className="sr-only">Mensaje</span>
          <input
            disabled
            placeholder="Escribe un mensaje…"
            className="w-full bg-transparent text-2xl text-ilustracion-texto placeholder:text-ilustracion-texto/60 focus:outline-none disabled:cursor-not-allowed"
          />
        </label>

        <div className="flex flex-col gap-3">
          <button type="button" disabled aria-label="Dictar un mensaje" className={`${BOTON_REDONDO} size-16`}>
            <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-[26px]">
              mic
            </span>
          </button>
          <button type="button" disabled aria-label="Enviar" className={`${BOTON_REDONDO} size-16`}>
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-[26px]">
              arrow_upward
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
