import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, Field, Input } from '@/shared/ui'
import type { Etiqueta } from '../data'

/*
  Crear una etiqueta como diálogo modal, y no como el input + botón que antes
  vivían siempre visibles en el filtro. Es `<dialog>` nativo a propósito: el
  navegador ya resuelve el atrapado de foco, el cierre con Escape y el
  `::backdrop`, así que no hace falta ninguna librería para un flujo que
  aparece pocas veces y dura segundos.

  El éxito devuelve la etiqueta creada, no solo `ok: true`: quien abre este
  diálogo desde una fila de conferencia la usa para asignarla ahí mismo, y sin
  el id de vuelta tendría que adivinarlo.
*/

export type ResultadoCreacion =
  | { readonly ok: true; readonly etiqueta: Etiqueta }
  | { readonly ok: false; readonly mensaje: string }

type PropsCreadorDeEtiqueta = {
  abierto: boolean
  alCerrar: () => void
  alCrear: (nombre: string) => ResultadoCreacion | Promise<ResultadoCreacion>
}

export function CreadorDeEtiqueta({ abierto, alCerrar, alCrear }: PropsCreadorDeEtiqueta) {
  const dialogoRef = useRef<HTMLDialogElement>(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialogo = dialogoRef.current

    if (dialogo === null) {
      return
    }

    if (abierto && !dialogo.open) {
      dialogo.showModal()
      setNombre('')
      setError(null)
    } else if (!abierto && dialogo.open) {
      dialogo.close()
    }
  }, [abierto])

  const [creando, setCreando] = useState(false)

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (creando) return

    setCreando(true)
    const resultado = await alCrear(nombre)
    setCreando(false)

    if (resultado.ok) {
      alCerrar()
    } else {
      setError(resultado.mensaje)
    }
  }

  return (
    <dialog
      ref={dialogoRef}
      /*
        `close` cubre tanto el botón Cancelar como Escape y el clic en el
        `::backdrop`: los tres disparan el mismo evento nativo, así que un
        único manejador basta para mantener sincronizado el estado del padre.
      */
      onClose={alCerrar}
      className="m-auto rounded-md border border-filete-fuerte bg-panel p-0 backdrop:bg-fondo/70"
    >
      <form onSubmit={(evento) => { void alEnviar(evento) }} className="flex w-72 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-texto">Nueva etiqueta</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <Field id="nombre-de-etiqueta" etiqueta="Nombre" {...(error === null ? {} : { error })}>
          <Input
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder="art1"
            autoFocus
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variante="sutil" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" variante="primario">
            Crear
          </Button>
        </div>
      </form>
    </dialog>
  )
}
