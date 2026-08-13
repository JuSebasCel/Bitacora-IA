import type { KeyboardEvent, ReactElement } from 'react'
import { useState } from 'react'
import { Button } from '@/shared/ui'

export type PropsCompositorDeMensaje = {
  generando: boolean
  alEnviar: (texto: string) => void
  alDetener: () => void
}

/*
  Caja de escritura del chat. El mismo botón cambia de función mientras
  genera ("Enviar" -> "Detener"): no hay dos botones superpuestos, solo uno
  cuyo rol depende de si hay una respuesta en curso.
*/
export function CompositorDeMensaje({ generando, alEnviar, alDetener }: PropsCompositorDeMensaje): ReactElement {
  const [valor, setValor] = useState('')

  function enviarSiHayTexto(): void {
    const limpio = valor.trim()
    if (limpio.length === 0) {
      return
    }
    alEnviar(limpio)
    setValor('')
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>): void {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault()
      if (!generando) {
        enviarSiHayTexto()
      }
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-filete p-3">
      <textarea
        value={valor}
        onChange={(evento) => setValor(evento.target.value)}
        onKeyDown={alPresionarTecla}
        rows={2}
        placeholder="Escribe una pregunta sobre tus conferencias…"
        className="min-h-[2.5rem] flex-1 resize-none rounded-md border border-filete bg-panel px-3 py-2 text-sm text-texto placeholder:text-texto-tenue focus:border-acento focus:outline-none"
      />

      {generando ? (
        <Button type="button" variante="secundario" onClick={alDetener}>
          Detener
        </Button>
      ) : (
        <Button type="button" variante="primario" onClick={enviarSiHayTexto} disabled={valor.trim().length === 0}>
          Enviar
        </Button>
      )}
    </div>
  )
}
