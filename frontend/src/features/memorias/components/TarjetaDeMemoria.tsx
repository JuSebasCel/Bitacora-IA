import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatearFecha } from '@/features/conferencias/data'
import type { Memoria } from '../data'
import { progresoDeGeneracion } from '../progreso'

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
  acento.

  La barra de "generando" vive aquí, no en el panel que la creó: al enviar
  el panel, la memoria queda guardada y su tarjeta aparece de inmediato en
  el listado con el avance de su generación (simulada, ver `../progreso.ts`)
  — mismo criterio que una conferencia recién cargada aparece "Procesando"
  en el dashboard (F3), en vez de bloquear el panel hasta que termine.
*/
export function TarjetaDeMemoria({
  memoria,
  nombreConferencia,
  nombrePlantilla,
  alEliminar,
}: PropsTarjetaDeMemoria): ReactElement {
  const [progreso, setProgreso] = useState(() => progresoDeGeneracion(memoria.generadaEl, Date.now()))

  useEffect(() => {
    if (progreso >= 100) {
      return
    }

    const intervalo = setInterval(() => {
      setProgreso(progresoDeGeneracion(memoria.generadaEl, Date.now()))
    }, 200)

    return () => clearInterval(intervalo)
  }, [memoria.generadaEl, progreso])

  const generando = progreso < 100

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
          {generando ? null : <span className="coordenada">{formatearFecha(memoria.generadaEl.slice(0, 10))}</span>}
        </div>

        {generando ? (
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div
              role="progressbar"
              aria-label={`Generando «${memoria.nombre}»`}
              aria-valuenow={progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 w-full overflow-hidden rounded-full bg-fondo"
            >
              <div
                className="h-full rounded-full bg-acento transition-[width] duration-200 ease-linear"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <span className="text-xs text-texto-tenue">Generando…</span>
          </div>
        ) : null}
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
