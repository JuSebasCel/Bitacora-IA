import type { ChangeEvent, ReactElement } from 'react'
import { useEffect } from 'react'
import { Button, Field, Select } from '@/shared/ui'
import type { OpcionDeSelect } from '@/shared/ui'
import { CAMPOS_DE_MARCADOR, ETIQUETAS_DE_CAMPO } from '../data'
import type { CampoDeMarcador, ElementoDePlantilla, FormatoDeMarcador, RolDeTexto } from '../data'

export type PropsInspectorDeElemento = {
  elemento: ElementoDePlantilla | null
  alActualizar: (cambios: Partial<ElementoDePlantilla>) => void
  alQuitar: () => void
}

const OPCIONES_DE_ROL: readonly OpcionDeSelect[] = [
  { valor: 'titulo', texto: 'Título' },
  { valor: 'subtitulo', texto: 'Subtítulo' },
  { valor: 'cuerpo', texto: 'Cuerpo' },
]

const OPCIONES_DE_FORMATO: readonly OpcionDeSelect[] = [
  { valor: 'parrafo', texto: 'Párrafo' },
  { valor: 'lista', texto: 'Lista' },
]

const OPCIONES_DE_CAMPO: readonly OpcionDeSelect[] = CAMPOS_DE_MARCADOR.map((campo) => ({
  valor: campo,
  texto: ETIQUETAS_DE_CAMPO[campo],
}))

function esCampoDeTexto(elemento: Element | null): boolean {
  return (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLTextAreaElement ||
    elemento instanceof HTMLSelectElement
  )
}

/*
  Panel lateral fijo con las propiedades del elemento seleccionado. No es un
  popover flotante a propósito: chocaría con el arrastre/redimensionado del
  elemento que está editando.
*/
export function InspectorDeElemento({
  elemento,
  alActualizar,
  alQuitar,
}: PropsInspectorDeElemento): ReactElement {
  useEffect(() => {
    if (elemento === null) {
      return
    }

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key !== 'Delete' && evento.key !== 'Backspace') {
        return
      }

      if (esCampoDeTexto(document.activeElement)) {
        return
      }

      alQuitar()
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [elemento, alQuitar])

  if (elemento === null) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-fondo p-4">
        <p className="text-sm text-texto-tenue">Elige un elemento del lienzo para editarlo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
      {elemento.tipo === 'texto' ? (
        <>
          <Field id="inspector-rol" etiqueta="Tamaño">
            <Select
              opciones={OPCIONES_DE_ROL}
              value={elemento.rol}
              onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                alActualizar({ rol: evento.target.value as RolDeTexto })
              }
            />
          </Field>

          <Field id="inspector-contenido" etiqueta="Contenido">
            <textarea
              value={elemento.contenido}
              onChange={(evento) => alActualizar({ contenido: evento.target.value })}
              rows={4}
              className="block w-full rounded-md border border-filete-fuerte bg-panel px-3 py-2 text-sm text-texto transition-colors placeholder:text-texto-tenue enabled:hover:border-acento focus:border-acento"
            />
          </Field>
        </>
      ) : null}

      {elemento.tipo === 'imagen' ? (
        <p className="text-sm text-texto">
          <span className="text-texto-tenue">Archivo: </span>
          {elemento.nombreDeArchivo}
        </p>
      ) : null}

      {elemento.tipo === 'marcador' ? (
        <>
          <Field id="inspector-campo" etiqueta="Campo">
            <Select
              opciones={OPCIONES_DE_CAMPO}
              value={elemento.campo}
              onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                alActualizar({ campo: evento.target.value as CampoDeMarcador })
              }
            />
          </Field>

          <Field id="inspector-formato" etiqueta="Formato">
            <Select
              opciones={OPCIONES_DE_FORMATO}
              value={elemento.formato}
              onChange={(evento: ChangeEvent<HTMLSelectElement>) =>
                alActualizar({ formato: evento.target.value as FormatoDeMarcador })
              }
            />
          </Field>
        </>
      ) : null}

      <Button variante="sutil" onClick={alQuitar}>
        Quitar elemento
      </Button>
    </div>
  )
}
