import type { FormEvent, ReactElement, RefObject } from 'react'
import { instruccionDeTono } from '@/features/plantillas/tono'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import { mensajeDeError } from '@/shared/errors'
import { Button, Field, Input, MensajeDeFormulario, Modal, SelectorDeOpciones } from '@/shared/ui'
import type { Memoria } from '../data'
import type { ResultadoMemoria } from '../memorias'
import { huecosDePlantilla } from '../redaccion'
import type { HuecoParaRedactar } from '../redaccion'

const ID_ERROR = 'generar-memoria-error'

export type PropsPanelDeGenerarMemoria = {
  abierto: boolean
  alCerrar: () => void
  /** Preselecciona una conferencia — punto de entrada desde el detalle de una conferencia específica. */
  idConferenciaPreseleccionada?: string
  /** El botón que lo abrió: el modal crece desde él. */
  anclaEn?: RefObject<HTMLElement | null>
  /** Se pasa desde la pantalla que ya tiene montado `useMemorias()`, para que el listado se actualice sin un segundo estado desincronizado. */
  generar: (
    idConferencia: string,
    idPlantilla: string,
    nombre: string,
    huecos?: readonly HuecoParaRedactar[],
    tono?: string,
  ) => Promise<ResultadoMemoria>
  alGenerar: (memoria: Memoria) => void
}

/*
  Generar una memoria: una conferencia analizada, una plantilla y un nombre.

  Es el modal del sistema, con las mismas pastillas que el de cargar una
  conferencia (el control lleva puesto su valor). Antes era un cajón
  lateral del diseño anterior, con desplegables nativos y filetes, lo único
  de la sección que no hablaba como el resto.

  Antes de generar dice qué va a pasar —cuántos campos va a escribir la IA,
  y cuáles—, porque es la única acción de la app que gasta la clave sin que
  se vea el trabajo mientras ocurre: el resumen es lo que la persona puede
  revisar antes de pagarla.

  El modal espera a que la memoria quede guardada de verdad y recién
  entonces se cierra: si falla, el error se muestra dentro del formulario
  que lo provocó, en vez de dejar a la persona mirando un listado sin su
  memoria y sin saber por qué.
*/
export function PanelDeGenerarMemoria({
  abierto,
  alCerrar,
  idConferenciaPreseleccionada,
  anclaEn,
  generar,
  alGenerar,
}: PropsPanelDeGenerarMemoria): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { visibles } = useConferenciasVisibles(idUsuario)
  const { plantillas } = usePlantillas()

  const [idConferencia, setIdConferencia] = useState('')
  const [idPlantilla, setIdPlantilla] = useState('')
  const [nombre, setNombre] = useState('')
  const [nombreTocado, setNombreTocado] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Cada apertura empieza limpia: lo de la vez anterior ya se generó o se descartó. */
  useEffect(() => {
    if (!abierto) {
      return
    }

    setIdConferencia(idConferenciaPreseleccionada ?? '')
    setIdPlantilla('')
    setNombre('')
    setNombreTocado(false)
    setGenerando(false)
    setError(null)
  }, [abierto, idConferenciaPreseleccionada])

  const conferenciasProcesadas = visibles.filter((visible) => visible.conferencia.estado === 'procesada')

  /*
    Reactivo a `visibles` a propósito, y no solo al elegir: si la conferencia
    llega preseleccionada con el modal ya abierto en el primer render, el
    listado puede resolverse en un commit posterior, y leerlo solo al abrir
    vería el arreglo todavía vacío.
  */
  useEffect(() => {
    if (nombreTocado || idConferencia === '') {
      return
    }

    const titulo = visibles.find((visible) => visible.conferencia.id === idConferencia)?.conferencia.titulo
    setNombre(titulo === undefined ? '' : `Memoria de ${titulo}`)
  }, [idConferencia, visibles, nombreTocado])

  const plantilla = plantillas.find((candidata) => candidata.id === idPlantilla)
  const huecos = plantilla === undefined ? [] : huecosDePlantilla(plantilla)
  const listo = idConferencia !== '' && idPlantilla !== ''

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (!listo || generando) return

    setGenerando(true)
    const resultado = await generar(idConferencia, idPlantilla, nombre, huecos, instruccionDeTono(plantilla?.tono))
    setGenerando(false)

    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    setError(null)
    alGenerar(resultado.memoria)
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Generar memoria"
      ancho="angosto"
      {...(anclaEn === undefined ? {} : { anclaEn })}
    >
      <form
        noValidate
        onSubmit={(evento) => void alEnviar(evento)}
        aria-describedby={error === null ? undefined : ID_ERROR}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col items-start gap-2">
          {conferenciasProcesadas.length === 0 ? (
            <p className="rounded-[20px] bg-acento-tenue px-4 py-3 text-sm text-texto-tenue">
              Todavía no tienes conferencias analizadas.
            </p>
          ) : (
            <SelectorDeOpciones
              etiquetaAccesible="Conferencia"
              icono="co_present"
              vacio="Elige una conferencia"
              valor={idConferencia}
              opciones={conferenciasProcesadas.map((visible) => ({
                valor: visible.conferencia.id,
                etiqueta: visible.conferencia.titulo,
              }))}
              alCambiar={setIdConferencia}
            />
          )}

          {plantillas.length === 0 ? (
            <p className="rounded-[20px] bg-acento-tenue px-4 py-3 text-sm text-texto-tenue">
              Todavía no hay plantillas.{' '}
              <Link
                to="/plantillas?nuevo=1"
                onClick={alCerrar}
                className="font-medium text-texto underline underline-offset-2"
              >
                Sube la primera
              </Link>
              .
            </p>
          ) : (
            <SelectorDeOpciones
              etiquetaAccesible="Plantilla"
              icono="description"
              vacio="Elige una plantilla"
              valor={idPlantilla}
              opciones={plantillas.map((candidata) => ({ valor: candidata.id, etiqueta: candidata.nombre }))}
              alCambiar={setIdPlantilla}
            />
          )}
        </div>

        {plantilla === undefined ? null : (
          <div className="flex gap-3 rounded-[20px] bg-acento-tenue p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ilustracion text-ilustracion-texto">
              <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-lg">
                auto_awesome
              </span>
            </span>
            <p className="text-sm leading-relaxed text-texto-tenue">
              {huecos.length === 0 ? (
                'Esta plantilla no tiene campos que la IA deba escribir.'
              ) : (
                <>
                  La IA va a escribir{' '}
                  <span className="font-medium text-texto">
                    {huecos.length === 1 ? 'un campo' : `${huecos.length} campos`}
                  </span>
                  : {resumenDeCampos(huecos)}.
                </>
              )}
            </p>
          </div>
        )}

        <Field id="memoria-nombre" etiqueta="Nombre">
          <Input
            value={nombre}
            onChange={(evento) => {
              setNombreTocado(true)
              setNombre(evento.target.value)
            }}
            placeholder="ej. Memoria de <título de la conferencia>"
          />
        </Field>

        {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

        <div className="flex justify-end">
          <Button type="submit" variante="primario" disabled={!listo} cargando={generando}>
            Generar memoria
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* Los nombres de los campos, sin volverse una lista larga: "Tesis, Método, Cifras y 2 más". */
function resumenDeCampos(huecos: readonly HuecoParaRedactar[]): string {
  const nombres = huecos.map((hueco) => hueco.nombre)
  const primeros = nombres.slice(0, 3).join(', ')
  return nombres.length > 3 ? `${primeros} y ${nombres.length - 3} más` : primeros
}
