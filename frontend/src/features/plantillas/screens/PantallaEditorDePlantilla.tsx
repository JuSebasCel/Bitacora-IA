import type { ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { Esqueleto, PanelDeError } from '@/shared/ui'
import { usePlantillas } from '../usePlantillas'
import { ConfirmacionDePlantillaDocx } from './ConfirmacionDePlantillaDocx'

/*
  La pantalla de una plantilla: resuelve cuál es por la URL y entrega su
  configuración a `ConfirmacionDePlantillaDocx`.

  Se llamaba "editor" porque aquí vivía el editor de la plantilla en blanco,
  un documento TipTap que se escribía dentro de la app. Se retiró: el diseño se
  hace en Word, y aquí solo se dice qué debe escribir la IA en cada campo. El
  nombre del archivo se conserva para no mover la ruta ni sus importaciones.
*/

function EnlaceDeRegreso(): ReactElement {
  return (
    <Link
      to="/plantillas"
      aria-label="Volver a plantillas"
      className="flex w-fit items-center gap-1 rounded-full py-1 pr-2 text-sm text-texto-tenue transition-colors hover:text-texto"
    >
      <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-base">
        arrow_back
      </span>
      Plantillas
    </Link>
  )
}

export function PantallaEditorDePlantilla(): ReactElement {
  const { idPlantilla = '' } = useParams()
  const mutadores = usePlantillas()
  const navegar = useNavigate()
  const plantilla = mutadores.plantillas.find((candidata) => candidata.id === idPlantilla)

  /*
    Mientras la lectura no resuelve, "no encontramos esa plantilla" sería
    literalmente falso: todavía no se buscó.
  */
  if (mutadores.cargando) {
    return <Esqueleto filas={4} etiqueta="Cargando la plantilla" />
  }

  if (mutadores.codigoDeError !== null || plantilla === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <EnlaceDeRegreso />
        <PanelDeError mensaje={mensajeDeError(mutadores.codigoDeError ?? 'PLANT_NO_ENCONTRADA')} />
      </div>
    )
  }

  return (
    <ConfirmacionDePlantillaDocx
      plantilla={plantilla}
      alRenombrar={(nombre) => mutadores.renombrarPlantilla(plantilla.id, nombre)}
      alCambiarMarcadores={(marcadores) => mutadores.actualizarMarcadoresDeDocx(plantilla.id, marcadores)}
      alEliminar={async () => {
        await mutadores.eliminar(plantilla.id)
        void navegar('/plantillas')
      }}
    />
  )
}
