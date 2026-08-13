import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { formatearFecha } from '@/features/conferencias/data'
import type { Memoria } from '../data'

export type PropsTarjetaDeMemoria = {
  memoria: Memoria
  nombreConferencia: string
  nombrePlantilla: string
  alEliminar: () => void
}

/*
  Tarjeta del listado de memorias: mismo vocabulario visual de superficies
  (`bg-panel`, sombra) que `TarjetaDePlantilla.tsx`. Sin miniatura propia —
  el documento generado se ve al entrar, no aquí.
*/
export function TarjetaDeMemoria({
  memoria,
  nombreConferencia,
  nombrePlantilla,
  alEliminar,
}: PropsTarjetaDeMemoria): ReactElement {
  function alPulsarEliminar(): void {
    if (window.confirm(`¿Eliminar la memoria «${memoria.nombre}»? Esta acción no se puede deshacer.`)) {
      alEliminar()
    }
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm">
      <Link to={`/memorias/${memoria.id}`} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileTextIcon size={16} weight="bold" className="shrink-0 text-texto-tenue" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-texto">{memoria.nombre}</span>
        </div>

        <div className="flex flex-col gap-0.5 text-xs text-texto-tenue">
          <span className="truncate">{nombreConferencia}</span>
          <span className="truncate">{nombrePlantilla}</span>
          <span>{formatearFecha(memoria.generadaEl.slice(0, 10))}</span>
        </div>
      </Link>

      <button
        type="button"
        onClick={alPulsarEliminar}
        aria-label={`Eliminar «${memoria.nombre}»`}
        className="absolute top-3 right-3 z-10 rounded-md bg-panel p-1.5 text-texto-tenue opacity-0 transition-colors hover:bg-fondo hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
      >
        <TrashIcon size={15} weight="regular" aria-hidden="true" />
      </button>
    </div>
  )
}
