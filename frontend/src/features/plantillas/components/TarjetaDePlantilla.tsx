import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import { useEditor } from '@tiptap/react'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import type { Plantilla, PlantillaDesdeDocx, PlantillaEnBlanco } from '../data'
import { EXTENSIONES_DE_PLANTILLA } from '../editor/extensionesDePlantilla'
import { useDocxDePlantilla } from '../useDocxDePlantilla'
import { EditorDeDocumento } from './EditorDeDocumento'
import { MiniaturaDeDocx } from './MiniaturaDeDocx'

export type PropsTarjetaDePlantilla = {
  plantilla: Plantilla
  alEliminar: () => void
}

function BotonEliminar({ nombre, alEliminar }: { nombre: string; alEliminar: () => void }): ReactElement {
  function alPulsar(): void {
    if (window.confirm(`¿Eliminar la plantilla «${nombre}»? Esta acción no se puede deshacer.`)) {
      alEliminar()
    }
  }

  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={`Eliminar «${nombre}»`}
      className="absolute top-3 right-3 z-10 rounded-md bg-panel p-1.5 text-texto-tenue opacity-0 transition-colors hover:bg-fondo hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
    >
      <TrashIcon size={15} weight="regular" aria-hidden="true" />
    </button>
  )
}

/*
  Tarjeta del listado para una plantilla en blanco: su propia instancia de
  editor TipTap, en modo lectura (`editable: false`), escalada dentro de un
  recorte de altura fija.
*/
function TarjetaDePlantillaEnBlanco({
  plantilla,
  alEliminar,
}: {
  plantilla: PlantillaEnBlanco
  alEliminar: () => void
}): ReactElement {
  const editor = useEditor({
    extensions: EXTENSIONES_DE_PLANTILLA,
    content: plantilla.contenido,
    editable: false,
    immediatelyRender: false,
  })

  /*
    `content` en `useEditor` solo cuenta para el montaje inicial: este efecto
    sincroniza cambios posteriores (ej. tras editar y volver al listado). Se
    salta la primera ejecución (montaje) a propósito — llamar `setContent`
    ahí duplicaba la carga inicial en el mismo instante en que la vista de
    ProseMirror recién se adjunta, y provocaba un error de selección
    ("Selection passed to setSelection must point at the current document")
    detectado en la revisión visual, no en ninguna prueba.
  */
  const esPrimeraEjecucion = useRef(true)

  useEffect(() => {
    if (esPrimeraEjecucion.current) {
      esPrimeraEjecucion.current = false
      return
    }

    if (editor !== null && !editor.isDestroyed) {
      editor.commands.setContent(plantilla.contenido)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantilla.actualizadaEl])

  return (
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm">
      <Link to={`/plantillas/${plantilla.id}`} className="flex flex-col gap-3">
        <div className="h-48 overflow-hidden rounded-sm border border-filete">
          <EditorDeDocumento editor={editor} className="pointer-events-none w-[161%] origin-top-left scale-[0.62]" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-texto">{plantilla.nombre}</span>
          <div className="flex shrink-0 items-center gap-1">
            <span
              aria-hidden="true"
              className="size-3.5 rounded-full border border-filete-fuerte"
              style={{ backgroundColor: plantilla.colorPrincipal }}
            />
            <span
              aria-hidden="true"
              className="size-3.5 rounded-full border border-filete-fuerte"
              style={{ backgroundColor: plantilla.colorSecundario }}
            />
          </div>
        </div>
      </Link>

      <BotonEliminar nombre={plantilla.nombre} alEliminar={alEliminar} />
    </div>
  )
}

/*
  Tarjeta del listado para una plantilla importada de `.docx`: miniatura del
  documento real (`MiniaturaDeDocx`, mismo `docx-preview` de la pantalla de
  confirmación, recortado y escalado) — para poder reconocer la plantilla
  antes de entrar a ella, no solo por el nombre.

  Desde B6 esa miniatura cuesta una descarga del bucket por tarjeta, donde
  antes eran bytes que ya estaban en `sessionStorage`. Se conserva igual: un
  `.docx` de trabajo real pesa decenas o pocos cientos de kilobytes (el tope
  de 10 MB de `validarDocx` es un freno contra abusos, no el caso normal), la
  respuesta la cachea el navegador, y sin miniatura el listado de plantillas
  importadas vuelve a ser una fila de nombres indistinguibles. Si algún día
  duele, la salida es una imagen de portada guardada al importar, no renderizar
  el documento a medias.
*/
function TarjetaDePlantillaDocx({
  plantilla,
  alEliminar,
}: {
  plantilla: PlantillaDesdeDocx
  alEliminar: () => void
}): ReactElement {
  const { archivo } = useDocxDePlantilla(plantilla.rutaArchivoOriginal)

  return (
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm">
      <Link to={`/plantillas/${plantilla.id}`} className="flex flex-col gap-3">
        <div className="h-48 overflow-hidden rounded-sm bg-fondo">
          <MiniaturaDeDocx archivo={archivo} />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-texto">{plantilla.nombre}</span>
          <span className="text-xs text-texto-tenue">
            {plantilla.marcadores.length} marcador{plantilla.marcadores.length === 1 ? '' : 'es'} detectado
            {plantilla.marcadores.length === 1 ? '' : 's'}
          </span>
        </div>
      </Link>

      <BotonEliminar nombre={plantilla.nombre} alEliminar={alEliminar} />
    </div>
  )
}

export function TarjetaDePlantilla({ plantilla, alEliminar }: PropsTarjetaDePlantilla): ReactElement {
  return plantilla.origen === 'docx' ? (
    <TarjetaDePlantillaDocx plantilla={plantilla} alEliminar={alEliminar} />
  ) : (
    <TarjetaDePlantillaEnBlanco plantilla={plantilla} alEliminar={alEliminar} />
  )
}
