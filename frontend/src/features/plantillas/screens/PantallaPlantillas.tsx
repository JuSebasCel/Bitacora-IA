import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { UploadIcon } from '@phosphor-icons/react/dist/csr/Upload'
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { mensajeDeError } from '@/shared/errors'
import { Button, EncabezadoDeSeccion, MensajeDeFormulario } from '@/shared/ui'
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
  const { plantillas, crear, crearDesdeDocx, eliminar, podarAbandonadas } = usePlantillas()
  const navigate = useNavigate()
  const refInput = useRef<HTMLInputElement>(null)
  const [importando, setImportando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
    Red de seguridad: por si se abandonó una plantilla en blanco sin pasar
    por el botón "Volver a plantillas" del editor (navegación lateral, atrás
    del navegador) — ver la nota en `PantallaEditorDePlantilla.tsx`.
    Idempotente (filtra lo que ya no aplica), así que no importa si
    `StrictMode` lo dispara dos veces.
  */
  useEffect(() => {
    podarAbandonadas()
  }, [podarAbandonadas])

  function alCrear(): void {
    const nueva = crear()
    void navigate(`/plantillas/${nueva.id}`)
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
    setImportando(false)

    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    const nombre = archivo.name.replace(/\.docx$/i, '').trim()
    const nueva = crearDesdeDocx(
      resultado.archivoOriginal,
      nombre.length > 0 ? nombre : 'Plantilla importada',
      resultado.marcadores,
    )
    void navigate(`/plantillas/${nueva.id}`)
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

            <Button variante="secundario" onClick={alCrear}>
              <PlusIcon size={14} weight="bold" aria-hidden="true" />
              Crear plantilla
            </Button>
          </div>

          {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}
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
