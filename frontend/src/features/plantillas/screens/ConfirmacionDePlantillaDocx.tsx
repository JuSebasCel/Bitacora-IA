import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple'
import { GitBranchIcon } from '@phosphor-icons/react/dist/csr/GitBranch'
import { RepeatIcon } from '@phosphor-icons/react/dist/csr/Repeat'
import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag'
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { Field, Input, Insignia, PanelDeError } from '@/shared/ui'
import type { MarcadorDeDocx, PlantillaDesdeDocx } from '../data'
import { VistaPreviaDeDocx } from '../components'
import { useDocxDePlantilla } from '../useDocxDePlantilla'

export type PropsConfirmacionDePlantillaDocx = {
  plantilla: PlantillaDesdeDocx
  alRenombrar: (nombre: string) => void
}

function etiquetaLegible(textoOriginal: string): string {
  return textoOriginal.replace(/^\[\[/, '').replace(/\]\]$/, '').trim()
}

/*
  Muestra el párrafo completo que rodea al marcador (ej. "Grupo de
  investigación: [[Nombre grupo]]"), con el propio marcador resaltado como
  chip y sin corchetes — contexto que la app ya tiene gratis del documento,
  en vez de pedir una descripción manual. Si por algún motivo el texto
  exacto no aparece dentro del contexto, se cae a mostrarlo completo tal
  cual, sin romper.
*/
function ContextoDeMarcador({
  contexto,
  textoOriginal,
}: {
  contexto: string
  textoOriginal: string
}): ReactElement {
  const indice = contexto.indexOf(textoOriginal)

  if (indice === -1) {
    return <span className="min-w-0 shrink text-sm leading-snug break-words text-texto line-clamp-3">{contexto}</span>
  }

  const antes = contexto.slice(0, indice)
  const despues = contexto.slice(indice + textoOriginal.length)

  return (
    <span className="min-w-0 shrink text-sm leading-snug break-words text-texto line-clamp-3">
      {antes}
      <span className="rounded bg-acento-tenue px-1.5 py-0.5 font-medium text-acento">
        {etiquetaLegible(textoOriginal)}
      </span>
      {despues}
    </span>
  )
}

function FilaDeMarcador({ marcador }: { marcador: MarcadorDeDocx }): ReactElement {
  if (marcador.tipo === 'simple') {
    return (
      <li className="flex items-start gap-2 rounded-md bg-fondo px-3 py-2">
        <TagIcon size={14} weight="bold" className="mt-1 shrink-0 text-texto-tenue" aria-hidden="true" />
        <ContextoDeMarcador contexto={marcador.contexto} textoOriginal={marcador.textoOriginal} />
      </li>
    )
  }

  const esCondicional = marcador.tipo === 'condicional'

  return (
    <li className="flex flex-col gap-1.5 rounded-md bg-fondo px-3 py-2">
      <div className="flex items-center gap-1.5">
        {esCondicional ? (
          <GitBranchIcon size={14} weight="bold" className="shrink-0 text-texto-tenue" aria-hidden="true" />
        ) : (
          <RepeatIcon size={14} weight="bold" className="shrink-0 text-texto-tenue" aria-hidden="true" />
        )}
        <Insignia tono="automatico">{esCondicional ? 'Condicional' : 'Repetible'}</Insignia>
      </div>
      <span className="min-w-0 shrink text-sm leading-snug break-words text-texto line-clamp-2">
        {marcador.descripcion}
      </span>
    </li>
  )
}

/*
  Pantalla de confirmación para una plantilla `origen: 'docx'` — no de
  mapeo. El archivo subido nunca se toca ni se completa desde aquí: a qué
  dato de una conferencia se liga cada marca lo decide la IA al generar una
  memoria (fuera de alcance todavía), no la persona que sube la plantilla.
  Lo único que esta pantalla hace es dejar ver, de solo lectura, que el
  documento subido es el correcto y que sus marcas se reconocieron, y
  ofrecer descargar ese mismo archivo original sin modificar.

  Desde B6 ese archivo ya no viaja dentro de la plantilla: se descarga del
  bucket `plantillas-docx` por su ruta (`useDocxDePlantilla`), y hasta que
  llega no hay enlace de descarga que ofrecer.
*/
export function ConfirmacionDePlantillaDocx({
  plantilla,
  alRenombrar,
}: PropsConfirmacionDePlantillaDocx): ReactElement {
  const [nombreLocal, setNombreLocal] = useState(plantilla.nombre)
  const { archivo: blob, codigoDeError } = useDocxDePlantilla(plantilla.rutaArchivoOriginal)
  const [urlDeDescarga, setUrlDeDescarga] = useState<string | null>(null)

  useEffect(() => {
    if (blob === null) {
      setUrlDeDescarga(null)
      return
    }

    const url = URL.createObjectURL(blob)
    setUrlDeDescarga(url)

    return () => URL.revokeObjectURL(url)
  }, [blob])

  function alCambiarNombre(evento: ChangeEvent<HTMLInputElement>): void {
    setNombreLocal(evento.target.value)
    alRenombrar(evento.target.value)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-md min-w-48 flex-1">
          <Field id="plantilla-nombre" etiqueta="Nombre">
            <Input value={nombreLocal} onChange={alCambiarNombre} />
          </Field>
        </div>

        {urlDeDescarga !== null ? (
          <a
            href={urlDeDescarga}
            download={`${nombreLocal.trim().length > 0 ? nombreLocal : 'plantilla'}.docx`}
            className="inline-flex items-center gap-1.5 text-sm text-acento hover:underline"
          >
            <DownloadSimpleIcon size={14} weight="bold" aria-hidden="true" />
            Descargar plantilla
          </a>
        ) : null}
      </div>

      {/*
        La descarga del archivo puede fallar sin que la plantilla esté mal: los
        marcadores detectados viven en la fila y se siguen viendo. Se avisa
        aquí, con nombre propio, en vez de dejar la vista previa vacía
        insinuando que el documento se perdió.
      */}
      {codigoDeError === null ? null : <PanelDeError mensaje={mensajeDeError(codigoDeError)} />}

      <section className="flex flex-col gap-4 rounded-md bg-panel p-6 shadow-sm">
        <div className="flex items-start gap-2 text-sm text-texto-tenue">
          <CheckCircleIcon
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-validado"
            aria-hidden="true"
          />
          <p>
            Este documento se conserva exactamente como lo subiste — el diseño se edita en Word, no aquí. El
            contenido de cada marca lo completa la IA al generar una memoria, no se configura desde esta pantalla.
          </p>
        </div>

        {plantilla.marcadores.length === 0 ? (
          <p className="text-sm text-texto-tenue">No encontramos ninguna marca «[[...]]» en este archivo.</p>
        ) : (
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-texto">
              Marcadores detectados ({plantilla.marcadores.length})
            </h2>

            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {plantilla.marcadores.map((marcador) => (
                <FilaDeMarcador key={marcador.id} marcador={marcador} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <VistaPreviaDeDocx blob={blob} />
    </div>
  )
}
