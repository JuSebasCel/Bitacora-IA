import type { ReactElement, SelectHTMLAttributes } from 'react'
import { BORDE_ERROR, unirClases } from './clases'

export type OpcionDeSelect = {
  readonly valor: string
  readonly texto: string
}

export type PropsSelect = SelectHTMLAttributes<HTMLSelectElement> & {
  invalido?: boolean
  opciones: readonly OpcionDeSelect[]
}

/*
  `select` nativo con los tokens del sistema.

  Nativo y no un desplegable propio: el del sistema operativo ya resuelve
  teclado, lector de pantalla y comportamiento en móvil mejor de lo que
  resolvería una reimplementación. Los widgets que de verdad necesitan Radix
  llegan en F4 y F7.

  Acepta `invalido` con la misma forma que `Input`, para que `Field` pueda
  clonarlo sin distinguir entre los dos.
*/
const CLASES_BASE =
  'block w-full appearance-none rounded-md border bg-panel px-3 py-2 text-sm text-texto ' +
  'transition-colors enabled:hover:border-acento focus:border-acento ' +
  'disabled:cursor-not-allowed disabled:opacity-55'

export function Select({
  invalido = false,
  opciones,
  className,
  'aria-invalid': ariaInvalid,
  ...resto
}: PropsSelect): ReactElement {
  return (
    <select
      {...resto}
      aria-invalid={invalido ? 'true' : ariaInvalid}
      className={unirClases(
        CLASES_BASE,
        invalido ? BORDE_ERROR : 'border-filete-fuerte',
        className,
      )}
    >
      {opciones.map((opcion) => (
        <option key={opcion.valor} value={opcion.valor}>
          {opcion.texto}
        </option>
      ))}
    </select>
  )
}
