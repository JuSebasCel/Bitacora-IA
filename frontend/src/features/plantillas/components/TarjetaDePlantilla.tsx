import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { LienzoDePlantilla } from './LienzoDePlantilla'
import type { Plantilla } from '../data'

export type PropsTarjetaDePlantilla = {
  plantilla: Plantilla
  alEliminar: () => void
}

/*
  Tarjeta del listado: mismo `LienzoDePlantilla` del editor, en modo no
  interactivo y dentro de un contenedor angosto — al ser `w-full` por dentro,
  se reduce solo con el ancho del contenedor, sin necesitar `transform:
  scale()`.
*/
export function TarjetaDePlantilla({ plantilla, alEliminar }: PropsTarjetaDePlantilla): ReactElement {
  function alPulsarEliminar(): void {
    if (window.confirm(`¿Eliminar la plantilla «${plantilla.nombre}»? Esta acción no se puede deshacer.`)) {
      alEliminar()
    }
  }

  return (
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm">
      <Link to={`/plantillas/${plantilla.id}`} className="flex flex-col gap-3">
        <LienzoDePlantilla elementos={plantilla.elementos} interactivo={false} />

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

      <button
        type="button"
        onClick={alPulsarEliminar}
        aria-label={`Eliminar «${plantilla.nombre}»`}
        className="absolute top-3 right-3 z-10 rounded-md bg-panel p-1.5 text-texto-tenue opacity-0 transition-colors hover:bg-fondo hover:text-error focus-visible:opacity-100 group-hover:opacity-100"
      >
        <TrashIcon size={15} weight="regular" aria-hidden="true" />
      </button>
    </div>
  )
}
