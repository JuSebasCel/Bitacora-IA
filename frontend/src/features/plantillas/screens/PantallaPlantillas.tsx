import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { UploadIcon } from '@phosphor-icons/react/dist/csr/Upload'
import type { ChangeEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import {
  Button,
  EncabezadoDeSeccion,
  EstadoVacio,
  Esqueleto,
  MensajeDeFormulario,
  PanelDeError,
} from '@/shared/ui'
import { TarjetaDePlantilla } from '../components'
import { importarDocx } from '../editor/importarDocx'
import { usePlantillas } from '../usePlantillas'

/*
  Listado de plantillas (F4). "Crear plantilla" no pide nombre antes: crea una
  en blanco y navega directo a su editor, donde se renombra. "Importar .docx"
  conserva el archivo intacto (ver `editor/importarDocx.ts`) y navega directo
  a una pantalla de solo confirmación: qué marcas `[[...]]` se reconocieron.
  A qué dato de una conferencia se liga cada una lo decide la IA al generar
  una memoria, no esta pantalla — aquí no hay ningún campo que llenar.
*/

const DESCRIPCION =
  'Diseña plantillas para las memorias del organizador: un documento en blanco con marcadores editables, o un archivo .docx que subas y se conserva intacto tal cual lo diseñaste en Word.'

const ID_ERROR = 'plantillas-error-importar'

export function PantallaPlantillas(): ReactElement {
  /*
    `podarAbandonadas` es la red de seguridad para una plantilla en blanco que
    se abandonó sin pasar por el botón "Volver a plantillas" del editor
    (navegación lateral, atrás del navegador) — ver la nota en
    `PantallaEditorDePlantilla.tsx`. Se pide aquí y no en el editor, que es
    donde una plantilla recién creada todavía tiene esa misma forma vacía.
  */
  const { plantillas, cargando, codigoDeError, crear, crearDesdeDocx, eliminar } = usePlantillas({
    podarAbandonadas: true,
  })
  const navigate = useNavigate()
  const refInput = useRef<HTMLInputElement>(null)
  const [importando, setImportando] = useState(false)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function alCrear(): Promise<void> {
    setCreando(true)
    setError(null)
    const resultado = await crear()
    setCreando(false)

    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    void navigate(`/plantillas/${resultado.plantilla.id}`)
  }

  async function alElegirDocx(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0] ?? null
    evento.target.value = ''

    if (archivo === null) {
      return
    }

    setImportando(true)
    setError(null)
    const resultado = await importarDocx(archivo)

    if (!resultado.ok) {
      setImportando(false)
      setError(mensajeDeError(resultado.codigo))
      return
    }

    /*
      El indicador de carga sigue encendido durante la subida al bucket y el
      insert: desde B6 esa es la parte lenta del flujo, y apagarlo al terminar
      de leer el archivo dejaría varios segundos de pantalla quieta después de
      elegir un `.docx` grande.
    */
    const nombre = archivo.name.replace(/\.docx$/i, '').trim()
    const creada = await crearDesdeDocx(
      archivo,
      nombre.length > 0 ? nombre : 'Plantilla importada',
      resultado.marcadores,
    )
    setImportando(false)

    if (!creada.ok) {
      setError(mensajeDeError(creada.codigo))
      return
    }

    void navigate(`/plantillas/${creada.plantilla.id}`)
  }

  return (
    <>
      <EncabezadoDeSeccion titulo="Plantillas" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button variante="secundario" onClick={() => refInput.current?.click()} cargando={importando}>
              <UploadIcon size={14} weight="bold" aria-hidden="true" />
              Importar .docx
            </Button>
            <input ref={refInput} type="file" accept=".docx" onChange={(evento) => void alElegirDocx(evento)} className="hidden" />

            <Button variante="secundario" onClick={() => void alCrear()} cargando={creando}>
              <PlusIcon size={14} weight="bold" aria-hidden="true" />
              Crear plantilla
            </Button>
          </div>

          {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}
        </div>

        {/*
          Tres desenlaces distintos, no dos. Sin el esqueleto, la lectura de
          red pintaría "todavía no hay plantillas" en cada visita antes de que
          llegue la primera fila; y una lectura que falla no es un listado
          vacío, así que dice qué pasó en vez de invitar a crear la primera
          plantilla sobre datos que no se pudieron leer.

          Eliminar plantillas es una acción soportada desde cada tarjeta, así
          que quedarse en cero sí es un estado alcanzable, no un caso
          imposible. Sin ese vacío, la pantalla quedaba en blanco y sin ninguna
          salida.
        */}
        {cargando ? (
          <Esqueleto filas={3} etiqueta="Cargando las plantillas" />
        ) : codigoDeError !== null ? (
          <PanelDeError mensaje={mensajeDeError(codigoDeError)} />
        ) : plantillas.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay plantillas"
            descripcion="Crea una plantilla en blanco para diseñarla aquí, o importa un .docx ya maquetado en Word para conservar su diseño intacto."
          />
        ) : (
          <ul
            aria-label="Plantillas"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {plantillas.map((plantilla) => (
              <li key={plantilla.id}>
                <TarjetaDePlantilla plantilla={plantilla} alEliminar={() => void eliminar(plantilla.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
