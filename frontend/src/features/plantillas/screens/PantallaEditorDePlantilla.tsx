import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { useEditor } from '@tiptap/react'
import type { ChangeEvent, DragEvent, ReactElement } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { Esqueleto, Field, Input, PanelDeError } from '@/shared/ui'
import { BarraDeHerramientas, EditorDeDocumento, FORMATO_MIME_MARCADOR, PaletaDeMarcadores } from '../components'
import type { OrigenDeMarcador, PlantillaEnBlanco } from '../data'
import { EXTENSIONES_DE_PLANTILLA } from '../editor/extensionesDePlantilla'
import { insertarMarcador, posicionDesdeCoordenadas } from '../editor/insertarMarcador'
import { NOMBRE_DE_PLANTILLA_SIN_TOCAR } from '../plantillas'
import { usePlantillas } from '../usePlantillas'
import type { ValorDePlantillas } from '../usePlantillas'
import { ConfirmacionDePlantillaDocx } from './ConfirmacionDePlantillaDocx'

/*
  Editor de una plantilla (F4), rediseño a documento en flujo. El documento
  edita y previsualiza a la vez: los marcadores ya se pintan con su contenido
  de ejemplo resuelto dentro del propio flujo de texto, sin una columna de
  vista previa aparte.

  Todo se guarda solo, sin botón "Guardar": cada `onUpdate` del editor
  persiste de inmediato vía `actualizarContenido`. El campo de nombre lleva
  su propio estado local para que escribir se sienta natural incluso
  mientras el valor pasa por un instante inválido (vacío) que
  `renombrarPlantilla` rechaza sin persistir.
*/

function EnlaceDeRegreso(): ReactElement {
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

type PropsEditorInterno = {
  plantilla: PlantillaEnBlanco
  mutadores: ValorDePlantillas
}

/*
  Componente separado, montado con `key={idPlantilla}` desde abajo: así,
  cambiar de plantilla (navegar de una a otra) remonta el editor con
  contenido inicial fresco en vez de intentar sincronizar el documento de
  TipTap de forma imperativa — el editor es "no controlado" después del
  primer render, igual que un `<input defaultValue>`.
*/
function EditorDePlantillaInterno({ plantilla, mutadores }: PropsEditorInterno): ReactElement {
  const { renombrarPlantilla, cambiarColores, actualizarContenido, eliminar } = mutadores
  const navigate = useNavigate()
  const [nombreLocal, setNombreLocal] = useState(plantilla.nombre)

  const editor = useEditor({
    extensions: EXTENSIONES_DE_PLANTILLA,
    content: plantilla.contenido,
    immediatelyRender: false,
    onUpdate: ({ editor: instancia }) => actualizarContenido(plantilla.id, instancia.getJSON()),
  })

  /*
    "Crear plantilla" persiste de inmediato (mismo criterio de autoguardado
    del resto del módulo), así que salir sin tocar nada dejaría una entrada
    en blanco acumulándose en el listado. Se resuelve al vuelo, en el propio
    clic de "Volver a plantillas" — no en la limpieza de un efecto: React
    StrictMode monta cada componente dos veces al aparecer por primera vez
    (efecto → limpieza fantasma → efecto de nuevo), y esa limpieza fantasma
    llegaba a borrar la plantilla recién creada antes de que la persona
    alcanzara a escribir nada. Un clic real, en cambio, solo ocurre una vez.
    `usePlantillas().podarAbandonadas` (disparado al montar el listado) es
    la red de seguridad para cualquier otra forma de salir (navegación
    lateral, atrás del navegador).
  */
  function alVolver(): void {
    const sinTocarElNombre = nombreLocal.trim() === NOMBRE_DE_PLANTILLA_SIN_TOCAR
    const documentoVacio = editor?.isEmpty ?? true

    if (sinTocarElNombre && documentoVacio) {
      void eliminar(plantilla.id)
    }

    void navigate('/plantillas')
  }

  function alCambiarNombre(evento: ChangeEvent<HTMLInputElement>): void {
    setNombreLocal(evento.target.value)
    renombrarPlantilla(plantilla.id, evento.target.value)
  }

  function alSoltarMarcador(evento: DragEvent<HTMLDivElement>): void {
    evento.preventDefault()

    const datos = evento.dataTransfer.getData(FORMATO_MIME_MARCADOR)
    if (datos.length === 0 || editor === null) {
      return
    }

    let origen: OrigenDeMarcador
    try {
      origen = JSON.parse(datos) as OrigenDeMarcador
    } catch {
      return
    }

    const posicion = posicionDesdeCoordenadas(editor, evento.clientX, evento.clientY)
    insertarMarcador(editor, origen, 'parrafo', posicion ?? undefined)
  }

  return (
    <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
      {/* El nombre editable de abajo cumple el rol visible de título; este encabezado es solo para lectores de pantalla. */}
      <h1 className="sr-only">Editar plantilla: {plantilla.nombre}</h1>

      <button
        type="button"
        onClick={alVolver}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-texto-tenue transition-colors hover:text-acento"
      >
        <ArrowLeftIcon size={14} weight="regular" aria-hidden="true" />
        Volver a plantillas
      </button>

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
            onChange={(evento) => cambiarColores(plantilla.id, evento.target.value, plantilla.colorSecundario)}
            className="h-9 w-16 cursor-pointer p-1"
          />
        </Field>

        <Field id="plantilla-color-secundario" etiqueta="Color secundario">
          <Input
            type="color"
            value={plantilla.colorSecundario}
            onChange={(evento) => cambiarColores(plantilla.id, plantilla.colorPrincipal, evento.target.value)}
            className="h-9 w-16 cursor-pointer p-1"
          />
        </Field>
      </div>

      <BarraDeHerramientas editor={editor} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
        <div onDragOver={(evento) => evento.preventDefault()} onDrop={alSoltarMarcador}>
          <EditorDeDocumento editor={editor} />
        </div>

        <PaletaDeMarcadores editor={editor} />
      </div>
    </div>
  )
}

export function PantallaEditorDePlantilla(): ReactElement {
  const { idPlantilla = '' } = useParams()
  const mutadores = usePlantillas()
  const plantilla = mutadores.plantillas.find((candidata) => candidata.id === idPlantilla)

  /*
    Mientras la lectura no resuelve, "no encontramos esa plantilla" es
    literalmente falso: todavía no se buscó. Sin este caso, entrar al editor
    (o recargar sobre su URL) mostraba el error de plantilla inexistente
    durante el primer instante de cada visita.
  */
  if (mutadores.cargando) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <Esqueleto filas={4} etiqueta="Cargando la plantilla" />
      </div>
    )
  }

  if (mutadores.codigoDeError !== null) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <PanelDeError mensaje={mensajeDeError(mutadores.codigoDeError)} />
        <EnlaceDeRegreso />
      </div>
    )
  }

  if (plantilla === undefined) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <PanelDeError mensaje={mensajeDeError('PLANT_NO_ENCONTRADA')} />
        <EnlaceDeRegreso />
      </div>
    )
  }

  if (plantilla.origen === 'docx') {
    return (
      <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
        <h1 className="sr-only">Plantilla: {plantilla.nombre}</h1>
        <EnlaceDeRegreso />
        <ConfirmacionDePlantillaDocx
          plantilla={plantilla}
          alRenombrar={(nombre) => mutadores.renombrarPlantilla(plantilla.id, nombre)}
        />
      </div>
    )
  }

  return <EditorDePlantillaInterno key={idPlantilla} plantilla={plantilla} mutadores={mutadores} />
}
