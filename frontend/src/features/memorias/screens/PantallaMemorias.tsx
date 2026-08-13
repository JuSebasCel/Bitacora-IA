import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import { Button, EncabezadoDeSeccion, EstadoVacio } from '@/shared/ui'
import { PanelDeGenerarMemoria, TarjetaDeMemoria } from '../components'
import { useMemorias } from '../useMemorias'

/*
  Listado de memorias (F5): las ya generadas, más el flujo para generar una
  nueva sobre una conferencia procesada y una plantilla guardada. Una memoria
  no se edita — solo se ve (`/memorias/:idMemoria`, donde se regenera al
  vuelo) o se elimina.

  `?conferencia=<id>` preselecciona y abre el panel automáticamente: es el
  punto de entrada desde el botón "Generar memoria" del detalle de una
  conferencia específica.
*/

const DESCRIPCION = 'Genera memorias formateadas combinando una conferencia ya procesada con una plantilla guardada.'

function nombreDeConferencia(visibles: readonly { conferencia: { id: string; titulo: string } }[], id: string): string {
  return visibles.find((visible) => visible.conferencia.id === id)?.conferencia.titulo ?? 'Conferencia no disponible'
}

function nombreDePlantilla(plantillas: readonly { id: string; nombre: string }[], id: string): string {
  return plantillas.find((plantilla) => plantilla.id === id)?.nombre ?? 'Plantilla no disponible'
}

export function PantallaMemorias(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { memorias, generar, eliminar } = useMemorias()
  const { visibles } = useConferenciasVisibles(idUsuario)
  const { plantillas } = usePlantillas()
  const [searchParams, setSearchParams] = useSearchParams()

  const idConferenciaPreseleccionada = searchParams.get('conferencia') ?? undefined
  const [panelAbierto, setPanelAbierto] = useState(idConferenciaPreseleccionada !== undefined)

  function cerrarPanel(): void {
    setPanelAbierto(false)
    if (idConferenciaPreseleccionada !== undefined) {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <>
      <EncabezadoDeSeccion titulo="Memorias" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex justify-end">
          <Button variante="secundario" onClick={() => setPanelAbierto(true)}>
            <PlusIcon size={14} weight="bold" aria-hidden="true" />
            Generar memoria
          </Button>
        </div>

        {memorias.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay memorias generadas"
            descripcion="Elige una conferencia procesada y una plantilla guardada para generar la primera."
          />
        ) : (
          <ul aria-label="Memorias" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memorias.map((memoria) => (
              <li key={memoria.id}>
                <TarjetaDeMemoria
                  memoria={memoria}
                  nombreConferencia={nombreDeConferencia(visibles, memoria.idConferencia)}
                  nombrePlantilla={nombreDePlantilla(plantillas, memoria.idPlantilla)}
                  alEliminar={() => eliminar(memoria.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PanelDeGenerarMemoria
        abierto={panelAbierto}
        alCerrar={cerrarPanel}
        {...(idConferenciaPreseleccionada === undefined ? {} : { idConferenciaPreseleccionada })}
        generar={generar}
        alGenerar={cerrarPanel}
      />
    </>
  )
}
