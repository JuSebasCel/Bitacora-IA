import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { unirClases } from './clases'

/*
  Botón del lenguaje nuevo: píldora completa, 40px de alto, con un icono de
  Material Symbols opcional a la izquierda.

  El primario es la superficie de mayor contraste de toda la interfaz —negro
  sobre claro, blanco sobre oscuro— porque en este sistema el acento no es un
  color, es contraste. Por eso no puede haber dos primarios compitiendo en la
  misma pantalla: el que lleve este botón es *la* acción de esa pantalla.

  El secundario no lleva fondo, solo el filete de 1px como `box-shadow` inset
  (nunca `border`: con borde real la caja cambia de tamaño entre variantes y
  los botones dejan de alinearse).
*/

export type VarianteDePildora = 'primario' | 'secundario'

export type PropsBotonPildora = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteDePildora
  /** Nombre del icono en Material Symbols, p. ej. `add`. */
  icono?: string
}

const BASE =
  'inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-base font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-55'

const VARIANTES: Record<VarianteDePildora, string> = {
  primario: 'bg-acento text-acento-contraste',
  secundario: 'text-texto-tenue shadow-[inset_0_0_0_1px_var(--bitacora-filete)] hover:text-texto',
}

export function BotonPildora({
  variante = 'secundario',
  icono,
  children,
  className,
  ...resto
}: PropsBotonPildora): ReactElement {
  return (
    <button {...resto} type={resto.type ?? 'button'} className={unirClases(BASE, VARIANTES[variante], className)}>
      {icono === undefined ? null : (
        <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
          {icono}
        </span>
      )}
      {children}
    </button>
  )
}
