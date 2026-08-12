import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import type { ReactElement } from 'react'
import { useNavigate } from 'react-router'
import { Button, EncabezadoDeSeccion } from '@/shared/ui'
import { TarjetaDePlantilla } from '../components'
import { usePlantillas } from '../usePlantillas'

/*
  Listado de plantillas (F4). "Crear plantilla" no pide nombre antes: crea una
  en blanco y navega directo a su editor, donde se renombra — mismo criterio
  que ya usa el panel de carga de F3 para no interponer un paso previo
  innecesario.
*/

const DESCRIPCION =
  'Diseña plantillas visuales para las memorias del organizador: logo, colores, estructura y marcadores que luego se rellenan con el contenido de cada conferencia.'

export function PantallaPlantillas(): ReactElement {
  const { plantillas, crear, eliminar } = usePlantillas()
  const navigate = useNavigate()

  function alCrear(): void {
    const nueva = crear()
    void navigate(`/plantillas/${nueva.id}`)
  }

  return (
    <>
      <EncabezadoDeSeccion titulo="Plantillas" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex justify-end">
          <Button variante="secundario" onClick={alCrear}>
            <PlusIcon size={14} weight="bold" aria-hidden="true" />
            Crear plantilla
          </Button>
        </div>

        <ul
          aria-label="Plantillas"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {plantillas.map((plantilla) => (
            <li key={plantilla.id}>
              <TarjetaDePlantilla plantilla={plantilla} alEliminar={() => eliminar(plantilla.id)} />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
