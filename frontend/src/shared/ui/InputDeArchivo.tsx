import type { ChangeEvent, DragEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
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
  caja que muestra el estado (invitación a arrastrar/elegir, "Suelta el
  archivo aquí" o el nombre ya elegido), la misma técnica que ya usan los
  radios de `SegmentacionDeOrigen`: nunca `sr-only`, que en F2 dejaba el
  control fuera del área donde de verdad cae un clic.

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

/*
  El navegador filtra `accept` por su cuenta en el diálogo nativo (clic), pero
  no en un `drop`: cualquier archivo del sistema operativo puede soltarse ahí
  sin pasar por ese filtro. Esta función replica esa misma regla (extensión
  con punto, tipo MIME exacto o comodín tipo "audio/*") para que soltar un
  archivo se comporte igual que elegirlo por clic, en vez de aceptar
  cualquier cosa.
*/
function archivoCoincideConAccept(archivo: File, accept: string): boolean {
  const patrones = accept
    .split(',')
    .map((patron) => patron.trim().toLowerCase())
    .filter((patron) => patron !== '')

  if (patrones.length === 0) {
    return true
  }

  const nombre = archivo.name.toLowerCase()
  const tipo = archivo.type.toLowerCase()

  return patrones.some((patron) => {
    if (patron.startsWith('.')) {
      return nombre.endsWith(patron)
    }
    if (patron.endsWith('/*')) {
      return tipo.startsWith(patron.slice(0, -1))
    }
    return tipo === patron
  })
}

const CLASES_CAJA_BASE =
  'flex h-full items-center rounded-md border px-3 py-2 text-sm transition-colors'

export function InputDeArchivo({
  id,
  invalido = false,
  'aria-describedby': ariaDescribedby,
  accept,
  archivo,
  alSeleccionar,
}: PropsInputDeArchivo): ReactElement {
  const [arrastrando, setArrastrando] = useState(false)
  /*
    El overlay del `<input>` y la caja visible son dos elementos dentro de la
    misma zona: cruzar de uno a otro dispara `dragLeave` seguido de
    `dragEnter`, y si solo se usara un booleano el parpadeo apagaría el
    estado visual a mitad de un arrastre real. Un contador de profundidad
    (en vez de estado) evita ese parpadeo sin re-render de más.
  */
  const profundidadDeArrastre = useRef(0)

  function alCambiar(evento: ChangeEvent<HTMLInputElement>): void {
    alSeleccionar(evento.target.files?.[0] ?? null)
  }

  function alArrastrarEncima(evento: DragEvent<HTMLDivElement>): void {
    /* Sin este preventDefault el navegador no permite soltar aquí. */
    evento.preventDefault()
    if (evento.dataTransfer !== null) {
      evento.dataTransfer.dropEffect = 'copy'
    }
  }

  function alEntrarArrastre(evento: DragEvent<HTMLDivElement>): void {
    evento.preventDefault()
    profundidadDeArrastre.current += 1
    setArrastrando(true)
  }

  function alSalirArrastre(evento: DragEvent<HTMLDivElement>): void {
    evento.preventDefault()
    profundidadDeArrastre.current = Math.max(0, profundidadDeArrastre.current - 1)
    if (profundidadDeArrastre.current === 0) {
      setArrastrando(false)
    }
  }

  function alSoltar(evento: DragEvent<HTMLDivElement>): void {
    /*
      preventDefault también cancela la acción por defecto del propio
      `<input type="file">` (asignar el drop a sus `files` sin pasar por
      nuestra validación de `accept`), no solo la de abrir el archivo en una
      pestaña nueva.
    */
    evento.preventDefault()
    profundidadDeArrastre.current = 0
    setArrastrando(false)

    const soltado = evento.dataTransfer?.files[0]
    if (soltado === undefined) {
      return
    }

    /*
      Un archivo que no coincide con `accept` se ignora en silencio, sin
      llamar a `alSeleccionar`: en un `<input>` normal el diálogo nativo ni
      siquiera lo habría dejado elegir, así que soltar uno no debería colar
      lo que el clic ya bloquea. La validación de dominio (extensión,
      tamaño) sigue viviendo en quien use este control, ver
      `carga/validacion.ts`.
    */
    if (!archivoCoincideConAccept(soltado, accept)) {
      return
    }

    alSeleccionar(soltado)
  }

  const clasesCaja = arrastrando
    ? unirClases(CLASES_CAJA_BASE, 'border-acento bg-acento-tenue text-acento')
    : unirClases(
        CLASES_CAJA_BASE,
        'bg-panel',
        invalido ? BORDE_ERROR : 'border-filete-fuerte',
        archivo === null ? 'text-texto-tenue' : 'text-texto',
      )

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative min-w-0 flex-1"
        onDragOver={alArrastrarEncima}
        onDragEnter={alEntrarArrastre}
        onDragLeave={alSalirArrastre}
        onDrop={alSoltar}
      >
        <div className={clasesCaja}>
          {arrastrando ? (
            'Suelta el archivo aquí'
          ) : archivo === null ? (
            'Arrastra tu archivo aquí o haz clic para elegirlo'
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
