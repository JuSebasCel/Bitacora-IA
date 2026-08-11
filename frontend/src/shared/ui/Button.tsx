import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { unirClases } from './clases'

export type VarianteBoton = 'primario' | 'secundario' | 'sutil'

export type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton
  cargando?: boolean
}

/*
  Base comun a las tres variantes: radio unico del sistema (`rounded-md`),
  realimentacion tactil minima al presionar y estado deshabilitado legible.
  El anillo de foco vive en la hoja de estilos global (`:focus-visible`).
*/
const CLASES_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ' +
  'transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55'

/*
  Los estados de hover van bajo `enabled:` para que un boton deshabilitado no
  reaccione al puntero (el boton conserva sus eventos de puntero para poder
  mostrar `cursor-not-allowed`).
*/
const CLASES_VARIANTE: Record<VarianteBoton, string> = {
  primario:
    'border border-acento bg-acento text-acento-contraste enabled:hover:border-acento-fuerte enabled:hover:bg-acento-fuerte',
  secundario:
    'border border-filete-fuerte bg-panel text-texto enabled:hover:border-acento enabled:hover:text-acento',
  sutil:
    'border border-transparent bg-transparent text-texto-tenue enabled:hover:bg-acento-tenue enabled:hover:text-acento',
}

/*
  `type` por defecto es `button` y no el `submit` que hereda el HTML: un boton
  secundario dentro de un formulario (Cancelar, Volver) no debe enviarlo. Quien
  consume el primitivo pide el envio explicitamente con `type="submit"`.
*/
export function Button({
  variante = 'primario',
  cargando = false,
  className,
  children,
  disabled,
  type = 'button',
  ...resto
}: PropsBoton): ReactElement {
  return (
    <button
      {...resto}
      type={type}
      className={unirClases(CLASES_BASE, CLASES_VARIANTE[variante], className)}
      disabled={disabled === true || cargando}
      aria-busy={cargando || undefined}
    >
      {cargando ? (
        <>
          {/*
            Anillo de filete girando: coherente con el lenguaje visual (filetes,
            no adornos) y sin dependencias de iconografia en un primitivo que
            importa toda la aplicacion.
          */}
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
          />
          {/* Indicador textual para lectores de pantalla; la etiqueta original se conserva. */}
          <span className="sr-only">Cargando</span>
        </>
      ) : null}
      {children}
    </button>
  )
}
