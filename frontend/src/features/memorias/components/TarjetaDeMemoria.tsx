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
  Tarjeta del listado de memorias. Mismo lenguaje de "registro vivo" que
  `FilaDeConferencia.tsx`: la superficie (`bg-panel`) ya separa cada tarjeta
  en reposo, y el hover no inventa el contraste desde cero, solo lo acentúa
  — sombra, barra de acento a la izquierda y el título pasa al color de
  acento. Sin eso la tarjeta se sentía plana frente al resto de la app, que
  sí trae ese vocabulario en Conferencias.
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
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm transition-shadow hover:shadow-md">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-0 w-0.5 scale-y-0 rounded-full bg-acento transition-transform duration-150 group-hover:scale-y-100"
      />

      <Link to={`/memorias/${memoria.id}`} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-acento-tenue text-acento">
            <FileTextIcon size={15} weight="bold" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-medium text-texto transition-colors group-hover:text-acento">
            {memoria.nombre}
          </span>
        </div>

        <div className="flex flex-col gap-0.5 text-xs text-texto-tenue">
          <span className="truncate">{nombreConferencia}</span>
          <span className="truncate">{nombrePlantilla}</span>
          <span className="coordenada">{formatearFecha(memoria.generadaEl.slice(0, 10))}</span>
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
