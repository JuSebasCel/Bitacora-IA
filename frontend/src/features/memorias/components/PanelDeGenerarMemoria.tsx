import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import { huecosDePlantilla } from '../redaccion'
import type { HuecoParaRedactar } from '../redaccion'
import { mensajeDeError } from '@/shared/errors'
import { Button, Field, Input, MensajeDeFormulario, Select } from '@/shared/ui'
import type { OpcionDeSelect } from '@/shared/ui'
import type { Memoria } from '../data'
import type { ResultadoMemoria } from '../memorias'

const ID_ERROR = 'generar-memoria-error'

export type PropsPanelDeGenerarMemoria = {
  abierto: boolean
  alCerrar: () => void
  /** Preselecciona una conferencia — punto de entrada desde el detalle de una conferencia específica. */
  idConferenciaPreseleccionada?: string
  /** Se pasa desde la pantalla que ya tiene montado `useMemorias()`, para que el listado se actualice sin un segundo estado desincronizado. */
  generar: (
    idConferencia: string,
    idPlantilla: string,
    nombre: string,
    huecos?: readonly HuecoParaRedactar[],
  ) => Promise<ResultadoMemoria>
  alGenerar: (memoria: Memoria) => void
}

/*
  Panel lateral deslizable para generar una memoria, mismo esqueleto que
  `PanelDeCarga.tsx` de F3 (bloqueo de scroll, cierre con Escape, foco
  devuelto a quien lo abrió). Sin diálogos de creación al vuelo: la
  conferencia y la plantilla ya existen, solo se eligen.

  Al enviar, el panel espera a que la memoria quede guardada de verdad y
  recién entonces se cierra (desde B6 `generar` escribe en Supabase). Cerrarlo
  antes, como hacía cuando el guardado era instantáneo, dejaría a la persona
  mirando un listado sin su memoria cuando el insert falla, y sin ningún lugar
  donde contarle por qué: el error se muestra dentro del formulario que lo
  provocó. Lo que sigue sin esperarse es la "generación" del documento en sí,
  que vive en la tarjeta del listado (`TarjetaDeMemoria.tsx`).
*/
export function PanelDeGenerarMemoria({
  abierto,
  alCerrar,
  idConferenciaPreseleccionada,
  generar,
  alGenerar,
}: PropsPanelDeGenerarMemoria) {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { visibles } = useConferenciasVisibles(idUsuario)
  const { plantillas } = usePlantillas()

  const panelRef = useRef<HTMLDivElement>(null)
  const alCerrarRef = useRef(alCerrar)
  const [idConferencia, setIdConferencia] = useState('')
  const [idPlantilla, setIdPlantilla] = useState('')
  const [nombre, setNombre] = useState('')
  const [nombreTocado, setNombreTocado] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    alCerrarRef.current = alCerrar
  })

  useEffect(() => {
    const panel = panelRef.current
    if (panel !== null) {
      panel.inert = !abierto
    }

    if (!abierto) {
      return
    }

    const enfocadoAntes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const desbordePrevio = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    setIdConferencia(idConferenciaPreseleccionada ?? '')
    setIdPlantilla('')
    setNombre('')
    setNombreTocado(false)
    setGenerando(false)
    setError(null)

    const primerCampo = panel?.querySelector<HTMLElement>('select, input')
    ;(primerCampo ?? panel)?.focus()

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') {
        alCerrarRef.current()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = desbordePrevio

      const aRestaurar = enfocadoAntes !== null && enfocadoAntes.isConnected ? enfocadoAntes : null
      aRestaurar?.focus()
    }
  }, [abierto, idConferenciaPreseleccionada])

  const conferenciasProcesadas = visibles.filter((visible) => visible.conferencia.estado === 'procesada')

  /*
    Reactivo a `visibles` a propósito, y no solo al elegir del `Select`: si la
    conferencia llega preseleccionada por `idConferenciaPreseleccionada`
    (punto de entrada desde el detalle de una conferencia, con el panel ya
    abierto en el primer render), `useConferenciasVisibles` puede resolver su
    propio listado en un commit posterior al que abre este panel — leerlo
    solo en el efecto de apertura vería el arreglo todavía vacío.
  */
  useEffect(() => {
    if (nombreTocado || idConferencia === '') {
      return
    }

    const titulo = visibles.find((visible) => visible.conferencia.id === idConferencia)?.conferencia.titulo
    setNombre(titulo === undefined ? '' : `Memoria de ${titulo}`)
  }, [idConferencia, visibles, nombreTocado])

  function elegirConferencia(valor: string): void {
    setIdConferencia(valor)
  }

  function elegirNombre(valor: string): void {
    setNombreTocado(true)
    setNombre(valor)
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()

    setGenerando(true)
    /*
      Los huecos salen de la plantilla elegida, con la instrucción que se le
      escribió al configurarla: es lo que el modelo tiene que redactar.
    */
    const plantilla = plantillas.find((candidata) => candidata.id === idPlantilla)
    const resultado = await generar(
      idConferencia,
      idPlantilla,
      nombre,
      plantilla === undefined ? [] : huecosDePlantilla(plantilla),
    )
    setGenerando(false)

    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    setError(null)
    alGenerar(resultado.memoria)
  }

  const opcionesDeConferencia: readonly OpcionDeSelect[] = [
    { valor: '', texto: 'Elige una conferencia procesada' },
    ...conferenciasProcesadas.map((visible) => ({ valor: visible.conferencia.id, texto: visible.conferencia.titulo })),
  ]

  const opcionesDePlantilla: readonly OpcionDeSelect[] = [
    { valor: '', texto: 'Elige una plantilla' },
    ...plantillas.map((plantilla) => ({ valor: plantilla.id, texto: plantilla.nombre })),
  ]

  return (
    <>
      <div
        aria-hidden="true"
        onClick={alCerrar}
        className={`fixed inset-0 z-40 bg-fondo/70 transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        {...(abierto ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Generar memoria' } : {})}
        aria-hidden={abierto ? undefined : 'true'}
        aria-describedby={error === null ? undefined : ID_ERROR}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(32rem,100vw)] flex-col border-l border-filete-fuerte bg-panel elevacion transition-transform duration-300 ease-out focus:outline-none ${
          abierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-filete px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-texto">Generar memoria</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <form noValidate onSubmit={(evento) => void alEnviar(evento)} className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <p className="text-sm text-texto-tenue">
            Combina una conferencia ya procesada con una plantilla guardada para generar su memoria.
          </p>

          <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
            <h3 className="text-sm font-medium text-texto">Origen de la memoria</h3>

            <Field id="memoria-conferencia" etiqueta="Conferencia">
              <Select
                opciones={opcionesDeConferencia}
                value={idConferencia}
                onChange={(evento) => elegirConferencia(evento.target.value)}
              />
            </Field>

            <Field id="memoria-plantilla" etiqueta="Plantilla">
              <Select
                opciones={opcionesDePlantilla}
                value={idPlantilla}
                onChange={(evento) => setIdPlantilla(evento.target.value)}
              />
            </Field>
          </div>

          <Field id="memoria-nombre" etiqueta="Nombre">
            <Input
              value={nombre}
              onChange={(evento) => elegirNombre(evento.target.value)}
              placeholder="ej. Memoria de <título de la conferencia>"
            />
          </Field>

          {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

          <Button type="submit" variante="primario" className="mt-1 w-full" cargando={generando}>
            Generar memoria
          </Button>
        </form>
      </div>
    </>
  )
}
