import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { FormEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { PERSONAS_DE_EJEMPLO } from '@/features/conferencias/data'
import type { Conferencia, PrivacidadDeComparticion } from '@/features/conferencias/data'
import { Button, Field, MensajeDeFormulario, Select } from '@/shared/ui'
import { useComparticiones } from '../useComparticiones'

/*
  Compartir vive en la conferencia que se quiere compartir, no en un
  formulario aparte en Configuración que obliga a buscarla en un desplegable
  genérico: quien está viendo "Sesgos algorítmicos en la asignación de
  subsidios" no debería tener que volver a encontrarla en una lista para
  compartirla. Mismo mecanismo de `<dialog>` nativo que `DialogoDeCreacion`
  (foco atrapado, Escape, backdrop, todo gratis del navegador).
*/

const PRIVACIDAD_INICIAL: PrivacidadDeComparticion = {
  compartirEtiquetas: false,
  compartirFichasPendientes: false,
  permitirValidarFichas: false,
  permitirRecompartir: false,
}

export type PropsDialogoDeCompartir = {
  abierto: boolean
  conferencia: Conferencia
  idUsuario: string
  /** Si quien tiene la sesión puede compartir esta conferencia: siempre si es propia, solo con permiso si es ajena. */
  puedeCompartir: boolean
  alCerrar: () => void
}

export function DialogoDeCompartir({
  abierto,
  conferencia,
  idUsuario,
  puedeCompartir,
  alCerrar,
}: PropsDialogoDeCompartir): ReactElement {
  const { invitar } = useComparticiones()
  const dialogoRef = useRef<HTMLDialogElement>(null)

  const [idInvitado, setIdInvitado] = useState('')
  const [privacidad, setPrivacidad] = useState<PrivacidadDeComparticion>(PRIVACIDAD_INICIAL)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialogo = dialogoRef.current
    if (dialogo === null) {
      return
    }

    if (abierto && !dialogo.open) {
      dialogo.showModal()
      setIdInvitado('')
      setPrivacidad(PRIVACIDAD_INICIAL)
      setError(null)
    } else if (!abierto && dialogo.open) {
      dialogo.close()
    }
  }, [abierto])

  const invitadosPosibles = PERSONAS_DE_EJEMPLO.filter(
    (persona) => persona.id !== idUsuario && !conferencia.comparticiones.some((c) => c.idInvitado === persona.id),
  )

  function alternarOpcion(clave: keyof PrivacidadDeComparticion): void {
    setPrivacidad((anterior) => ({ ...anterior, [clave]: !anterior[clave] }))
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault()

    const resultado = invitar(conferencia, idInvitado, puedeCompartir, privacidad)

    if (resultado.ok) {
      alCerrar()
    } else {
      setError(resultado.mensaje)
    }
  }

  return (
    <dialog
      ref={dialogoRef}
      onClose={alCerrar}
      className="m-auto rounded-md border border-filete-fuerte bg-panel p-0 backdrop:bg-fondo/70"
    >
      <form onSubmit={alEnviar} className="flex w-80 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-texto">Compartir «{conferencia.titulo}»</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {invitadosPosibles.length === 0 ? (
          <p className="text-sm text-texto-tenue">
            Ya la compartiste con todas las personas registradas que puedes invitar.
          </p>
        ) : (
          <>
            <Field id="compartir-invitado" etiqueta="Compartir con">
              <Select
                autoFocus
                value={idInvitado}
                onChange={(evento) => setIdInvitado(evento.target.value)}
                opciones={[
                  { valor: '', texto: 'Elige una persona' },
                  ...invitadosPosibles.map((persona) => ({ valor: persona.id, texto: persona.nombre })),
                ]}
              />
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-texto-tenue">Privacidad de esta compartición</legend>
              {(
                [
                  ['compartirEtiquetas', 'Compartir mis etiquetas'],
                  ['compartirFichasPendientes', 'Incluir fichas pendientes de revisión'],
                  ['permitirValidarFichas', 'Permitir que valide fichas'],
                  ['permitirRecompartir', 'Permitir que vuelva a compartirla'],
                ] as const
              ).map(([clave, texto]) => (
                <label key={clave} className="flex items-center gap-2 text-sm text-texto">
                  <input type="checkbox" checked={privacidad[clave]} onChange={() => alternarOpcion(clave)} />
                  {texto}
                </label>
              ))}
            </fieldset>

            {error === null ? null : <MensajeDeFormulario id="compartir-error">{error}</MensajeDeFormulario>}

            <div className="flex justify-end gap-2">
              <Button type="button" variante="sutil" onClick={alCerrar}>
                Cancelar
              </Button>
              <Button type="submit" variante="primario">
                Enviar invitación
              </Button>
            </div>
          </>
        )}
      </form>
    </dialog>
  )
}
