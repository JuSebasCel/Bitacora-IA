import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { unirClases } from './clases'

export type VarianteBoton = 'primario' | 'secundario' | 'sutil'

export type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton
  cargando?: boolean
}

/*
  Base comun a las tres variantes: la misma pildora de `BotonPildora` —40 px
  de alto, radio completo, texto de 16—, para que un formulario viejo y una
  pantalla nueva no tengan dos botones distintos. El anillo de foco vive en
  la hoja de estilos global (`:focus-visible`).
*/
const CLASES_BASE =
  'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-base font-medium ' +
  'transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55'

/*
  Los estados de hover van bajo `enabled:` para que un boton deshabilitado no
  reaccione al puntero (el boton conserva sus eventos de puntero para poder
  mostrar `cursor-not-allowed`).
*/
const CLASES_VARIANTE: Record<VarianteBoton, string> = {
  primario: 'bg-acento text-acento-contraste enabled:hover:bg-acento-fuerte',
  secundario:
    'text-texto-tenue shadow-[inset_0_0_0_1px_var(--bitacora-filete)] enabled:hover:text-texto',
  sutil: 'bg-transparent text-texto-tenue enabled:hover:bg-acento-tenue enabled:hover:text-texto',
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
