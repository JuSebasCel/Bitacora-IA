import type { InputHTMLAttributes, ReactElement } from 'react'
import { BORDE_ERROR, CLASES_CONTROL_BASE, unirClases } from './clases'

export type PropsInput = InputHTMLAttributes<HTMLInputElement> & {
  invalido?: boolean
}

/*
  El `placeholder` nunca sustituye a la etiqueta: la etiqueta la aporta `Field`
  (o un `aria-label` explicito de quien consuma el primitivo).
*/
const CLASES_BASE = `${CLASES_CONTROL_BASE} placeholder:text-texto-tenue`

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
