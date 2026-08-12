import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { FormEvent } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './Button'
import { Field } from './Field'
import { Input } from './Input'

/*
  Diálogo genérico de "crear algo con un nombre": la misma forma exacta que
  usaba `CreadorDeEtiqueta` (F2), generalizada porque el directorio de
  eventos y ponentes (F3) necesita el mismo flujo dos veces más. `<dialog>`
  nativo a propósito: el navegador ya resuelve el atrapado de foco, el cierre
  con Escape y el `::backdrop`, así que no hace falta ninguna librería para un
  flujo que aparece pocas veces y dura segundos.

  `alCrear` devuelve éxito o un mensaje ya traducido, no un código: este
  componente no conoce el catálogo de errores, cada dominio (etiquetas,
  eventos, ponentes) traduce el suyo antes de pasarlo aquí.
*/

export type ResultadoDeCreacion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type PropsDialogoDeCreacion = {
  abierto: boolean
  titulo: string
  etiquetaCampo: string
  placeholder?: string
  alCerrar: () => void
  alCrear: (nombre: string) => ResultadoDeCreacion
}

export function DialogoDeCreacion({
  abierto,
  titulo,
  etiquetaCampo,
  placeholder,
  alCerrar,
  alCrear,
}: PropsDialogoDeCreacion) {
  const dialogoRef = useRef<HTMLDialogElement>(null)
  const idCampo = useId()
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

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault()

    const resultado = alCrear(nombre)

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
      <form onSubmit={alEnviar} className="flex w-72 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-texto">{titulo}</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <Field id={idCampo} etiqueta={etiquetaCampo} {...(error === null ? {} : { error })}>
          <Input
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            placeholder={placeholder}
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
