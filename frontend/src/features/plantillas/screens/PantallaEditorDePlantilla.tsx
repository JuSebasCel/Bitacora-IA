import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { Field, Input, PanelDeError } from '@/shared/ui'
import { BarraDeHerramientas, InspectorDeElemento, LienzoDePlantilla } from '../components'
import { usePlantillas } from '../usePlantillas'

/*
  Editor de una plantilla (F4). El lienzo edita y previsualiza a la vez: no
  hay una columna de "vista previa" aparte, los marcadores ya se pintan con
  su contenido de ejemplo resuelto dentro del propio lienzo.

  Todo se guarda solo, sin botón "Guardar": cada mutación de `usePlantillas`
  persiste de inmediato. El campo de nombre lleva su propio estado local para
  que escribir se sienta natural incluso mientras el valor pasa por un
  instante inválido (vacío) que `renombrarPlantilla` rechaza sin persistir —
  el campo sigue mostrando lo que se escribió, solo que esa tecla en concreto
  no llegó a guardarse.
*/

function EnlaceDeRegreso() {
  return (
    <Link
      to="/plantillas"
      className="inline-flex items-center gap-1.5 text-sm text-texto-tenue transition-colors hover:text-acento"
    >
      <ArrowLeftIcon size={14} weight="regular" aria-hidden="true" />
      Volver a plantillas
    </Link>
  )
}

export function PantallaEditorDePlantilla(): ReactElement {
  const { idPlantilla = '' } = useParams()
  const {
    plantillas,
    renombrarPlantilla,
    cambiarColores,
    agregarElementoDeTexto,
    agregarElementoDeImagen,
    agregarElementoDeMarcador,
    actualizarElemento,
    quitarElemento,
  } = usePlantillas()

  const plantilla = plantillas.find((candidata) => candidata.id === idPlantilla)

  const [idSeleccionado, setIdSeleccionado] = useState<string | null>(null)
  const [nombreLocal, setNombreLocal] = useState(plantilla?.nombre ?? '')

  useEffect(() => {
    setIdSeleccionado(null)
    setNombreLocal(plantilla?.nombre ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPlantilla])

  if (plantilla === undefined) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <PanelDeError mensaje={mensajeDeError('PLANT_NO_ENCONTRADA')} />
        <EnlaceDeRegreso />
      </div>
    )
  }

  function alCambiarNombre(evento: ChangeEvent<HTMLInputElement>): void {
    setNombreLocal(evento.target.value)
    renombrarPlantilla(idPlantilla, evento.target.value)
  }

  const elementoSeleccionado = plantilla.elementos.find((elemento) => elemento.id === idSeleccionado) ?? null

  return (
    <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
      {/* El nombre editable de abajo cumple el rol visible de título; este encabezado es solo para lectores de pantalla. */}
      <h1 className="sr-only">Editar plantilla: {plantilla.nombre}</h1>

      <EnlaceDeRegreso />

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-48 flex-1">
          <Field id="plantilla-nombre" etiqueta="Nombre">
            <Input value={nombreLocal} onChange={alCambiarNombre} />
          </Field>
        </div>

        <Field id="plantilla-color-principal" etiqueta="Color principal">
          <Input
            type="color"
            value={plantilla.colorPrincipal}
            onChange={(evento) =>
              cambiarColores(idPlantilla, evento.target.value, plantilla.colorSecundario)
            }
            className="h-9 w-16 cursor-pointer p-1"
          />
        </Field>

        <Field id="plantilla-color-secundario" etiqueta="Color secundario">
          <Input
            type="color"
            value={plantilla.colorSecundario}
            onChange={(evento) =>
              cambiarColores(idPlantilla, plantilla.colorPrincipal, evento.target.value)
            }
            className="h-9 w-16 cursor-pointer p-1"
          />
        </Field>
      </div>

      <BarraDeHerramientas
        onAgregarTexto={() => agregarElementoDeTexto(idPlantilla)}
        onAgregarMarcador={() => agregarElementoDeMarcador(idPlantilla)}
        onAgregarImagen={(url, nombreDeArchivo) =>
          agregarElementoDeImagen(idPlantilla, url, nombreDeArchivo)
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <LienzoDePlantilla
          elementos={plantilla.elementos}
          idSeleccionado={idSeleccionado}
          alSeleccionar={setIdSeleccionado}
          alCambiarPosicion={(idElemento, posicion) =>
            actualizarElemento(idPlantilla, idElemento, { posicion })
          }
        />

        <InspectorDeElemento
          elemento={elementoSeleccionado}
          alActualizar={(cambios) => {
            if (elementoSeleccionado !== null) {
              actualizarElemento(idPlantilla, elementoSeleccionado.id, cambios)
            }
          }}
          alQuitar={() => {
            if (elementoSeleccionado !== null) {
              quitarElemento(idPlantilla, elementoSeleccionado.id)
              setIdSeleccionado(null)
            }
          }}
        />
      </div>
    </div>
  )
}
