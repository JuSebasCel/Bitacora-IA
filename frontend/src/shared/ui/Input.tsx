import type { InputHTMLAttributes, ReactElement } from 'react'
import { BORDE_ERROR, unirClases } from './clases'

export type PropsInput = InputHTMLAttributes<HTMLInputElement> & {
  invalido?: boolean
}

/*
  El `placeholder` nunca sustituye a la etiqueta: la etiqueta la aporta `Field`
  (o un `aria-label` explicito de quien consuma el primitivo).
*/
const CLASES_BASE =
  'block w-full rounded-md border bg-panel px-3 py-2 text-sm text-texto ' +
  'transition-colors placeholder:text-texto-tenue enabled:hover:border-acento ' +
  'focus:border-acento disabled:cursor-not-allowed disabled:opacity-55'

export function Input({
  invalido = false,
  className,
  'aria-invalid': ariaInvalid,
  ...resto
}: PropsInput): ReactElement {
  return (
    <input
      {...resto}
      aria-invalid={invalido ? 'true' : ariaInvalid}
      className={unirClases(
        CLASES_BASE,
        invalido ? BORDE_ERROR : 'border-filete-fuerte',
        className,
      )}
    />
  )
}
