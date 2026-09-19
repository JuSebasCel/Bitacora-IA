import type { ReactElement, Ref } from 'react'
import { M3_FILETE, M3_PANEL_ALTO, M3_PRIMARIO_BG, M3_PRIMARIO_TEXTO, M3_TEXTO_SECUNDARIO } from './paleta'

/*
  Buscador: píldora sobre `surface-container`, la misma superficie que el
  selector de vista — en la referencia los dos controles comparten tono y
  alto (40px), y se leen como una sola fila de controles.
*/
export function PildoraDeBusqueda(): ReactElement {
  return (
    <button
      type="button"
      className={`${M3_PANEL_ALTO} flex h-10 cursor-pointer items-center gap-2 rounded-full px-4`}
    >
      <span aria-hidden="true" className={`material-symbols-rounded icono-contorno text-lg ${M3_TEXTO_SECUNDARIO}`}>
        search
      </span>
      <span className={`text-base ${M3_TEXTO_SECUNDARIO}`}>Buscar</span>
    </button>
  )
}

/*
  Botón primario. En la referencia `--md-sys-color-primary` es blanco puro en
  oscuro y negro en claro: el rol de "acento" lo cumple el contraste, no un
  color. Por eso este botón es la superficie de mayor contraste de la interfaz.
*/
export function BotonPrimario({ children }: { children: string }): ReactElement {
  return (
    <button
      type="button"
      className={`${M3_PRIMARIO_BG} ${M3_PRIMARIO_TEXTO} flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-base font-medium`}
    >
      <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
        add
      </span>
      {children}
    </button>
  )
}

/* Acepta `ref` porque un modal puede necesitar medirlo para crecer desde él. */
export function BotonSecundario({
  children,
  alPulsar,
  ref,
}: {
  children: string
  alPulsar?: () => void
  ref?: Ref<HTMLButtonElement>
}): ReactElement {
  return (
    <button
      ref={ref}
      type="button"
      onClick={alPulsar}
      className={`${M3_FILETE} ${M3_TEXTO_SECUNDARIO} h-10 cursor-pointer rounded-full px-4 text-base font-normal`}
    >
      {children}
    </button>
  )
}

/* El selector de vista vive en `componentes/SelectorDeVista.tsx`, ya aprobado. */
