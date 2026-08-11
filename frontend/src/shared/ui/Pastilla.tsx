import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement } from 'react'
import { unirClases } from './clases'

/*
  Etiqueta personal dibujada.

  Se llama Pastilla y no Etiqueta a propósito: en este proyecto `etiqueta` ya
  significa "rótulo de un control" (Field.etiqueta), y usar la misma palabra
  para el concepto de dominio dejaría dos sentidos conviviendo en el mismo
  archivo.

  Sin `alQuitar` es estática, que es el caso de una etiqueta puesta por quien
  compartió la conferencia: se ve, pero no es de quien mira y no se quita.
*/

export type PropsPastilla = {
  nombre: string
  /** Si se omite, la pastilla es estática y no ofrece control de quitar. */
  alQuitar?: () => void
}

const CLASES_BASE =
  'inline-flex items-center gap-1 rounded-md border border-filete-fuerte bg-panel py-0.5 pl-2 text-xs text-texto-tenue'

export function Pastilla({ nombre, alQuitar }: PropsPastilla): ReactElement {
  if (alQuitar === undefined) {
    return <span className={unirClases(CLASES_BASE, 'pr-2')}>{nombre}</span>
  }

  return (
    <span className={unirClases(CLASES_BASE, 'pr-0.5')}>
      {nombre}
      <button
        type="button"
        onClick={alQuitar}
        /* El nombre va dentro del botón: en una lista de pastillas, "Quitar" a secas no dice cuál. */
        aria-label={`Quitar la etiqueta ${nombre}`}
        className="rounded-md p-0.5 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
      >
        <XIcon size={12} weight="bold" aria-hidden="true" />
      </button>
    </span>
  )
}
