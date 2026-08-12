import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import type { ChangeEvent, ReactElement } from 'react'
import { useRef, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { Button, MensajeDeFormulario } from '@/shared/ui'
import { validarImagen } from '../plantillas'

export type PropsBarraDeHerramientas = {
  onAgregarTexto: () => void
  onAgregarMarcador: () => void
  onAgregarImagen: (url: string, nombreDeArchivo: string) => void
}

const ID_ERROR = 'barra-herramientas-error'

/*
  "+ Imagen" dispara un `<input type="file">` oculto por programa: a
  diferencia de `InputDeArchivo` (una caja de formulario con su propio rótulo
  y estado de "elegido"), aquí el disparador es un botón de barra de
  herramientas más — no hace falta la caja, solo el selector nativo.
*/
export function BarraDeHerramientas({
  onAgregarTexto,
  onAgregarMarcador,
  onAgregarImagen,
}: PropsBarraDeHerramientas): ReactElement {
  const refInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0] ?? null
    evento.target.value = ''

    if (archivo === null) {
      return
    }

    const resultado = validarImagen(archivo)
    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    setError(null)

    const lector = new FileReader()
    lector.onload = () => {
      if (typeof lector.result === 'string') {
        onAgregarImagen(lector.result, archivo.name)
      }
    }
    lector.readAsDataURL(archivo)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variante="secundario" onClick={onAgregarTexto}>
          <PlusIcon size={14} weight="bold" aria-hidden="true" />
          Texto
        </Button>
        <Button variante="secundario" onClick={onAgregarMarcador}>
          <PlusIcon size={14} weight="bold" aria-hidden="true" />
          Marcador
        </Button>
        <Button variante="secundario" onClick={() => refInput.current?.click()}>
          <PlusIcon size={14} weight="bold" aria-hidden="true" />
          Imagen
        </Button>
        <input
          ref={refInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={alElegirArchivo}
          className="hidden"
        />
      </div>

      {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}
    </div>
  )
}
