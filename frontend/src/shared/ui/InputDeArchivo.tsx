import type { ChangeEvent, ReactElement } from 'react'
import { Button } from './Button'
import { BORDE_ERROR, unirClases } from './clases'

export type PropsInputDeArchivo = {
  id?: string
  invalido?: boolean
  'aria-describedby'?: string
  /** Lista de extensiones o tipos MIME que acepta el control nativo. */
  accept: string
  archivo: File | null
  alSeleccionar: (archivo: File | null) => void
}

/*
  El control real (`<input type="file">`) es transparente y cubre toda la
  caja que muestra el estado ("Elegir archivo" o el nombre ya elegido) — la
  misma técnica que ya usan los radios de `SegmentacionDeOrigen`: nunca
  `sr-only`, que en F2 dejaba el control fuera del área donde de verdad cae un
  clic.

  El botón "Quitar" queda fuera de esa caja a propósito, como hermano y no
  como hijo: si estuviera dentro, el `<input>` transparente lo taparía y el
  clic nunca llegaría al botón.
*/
function formatearTamano(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CLASES_CAJA =
  'flex h-full items-center rounded-md border bg-panel px-3 py-2 text-sm transition-colors'

export function InputDeArchivo({
  id,
  invalido = false,
  'aria-describedby': ariaDescribedby,
  accept,
  archivo,
  alSeleccionar,
}: PropsInputDeArchivo): ReactElement {
  function alCambiar(evento: ChangeEvent<HTMLInputElement>): void {
    alSeleccionar(evento.target.files?.[0] ?? null)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <div
          className={unirClases(
            CLASES_CAJA,
            invalido ? BORDE_ERROR : 'border-filete-fuerte',
            archivo === null ? 'text-texto-tenue' : 'text-texto',
          )}
        >
          {archivo === null ? (
            'Elegir archivo'
          ) : (
            <span className="truncate">
              {archivo.name}
              <span className="text-texto-tenue"> · {formatearTamano(archivo.size)}</span>
            </span>
          )}
        </div>

        <input
          type="file"
          id={id}
          accept={accept}
          aria-invalid={invalido ? 'true' : undefined}
          aria-describedby={ariaDescribedby}
          onChange={alCambiar}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {archivo === null ? null : (
        <Button
          type="button"
          variante="sutil"
          onClick={() => alSeleccionar(null)}
          aria-label={`Quitar ${archivo.name}`}
        >
          Quitar
        </Button>
      )}
    </div>
  )
}
