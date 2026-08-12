import type { ReactElement } from 'react'
import { Field, Input, Select } from '@/shared/ui'
import { CAMPOS_DE_MARCADOR, ETIQUETAS_DE_CAMPO } from '../../data'
import type { CampoDeMarcador, OrigenDeMarcador } from '../../data'

export type PropsSelectorDeOrigen = {
  idBase: string
  origen: OrigenDeMarcador
  alCambiar: (origen: OrigenDeMarcador) => void
}

const OPCION_PERSONALIZADA = 'personalizado'

/*
  Selector compartido por el chip de marcador y la sección condicional/
  repetible: elegir uno de los cinco campos fijos del repositorio, o escribir
  una descripción libre cuando ninguno aplica (el patrón real que usa
  `.agent/examples/tem.docx`, ej. "Bullet points de la agenda").
*/
export function SelectorDeOrigen({ idBase, origen, alCambiar }: PropsSelectorDeOrigen): ReactElement {
  const opciones = [
    ...CAMPOS_DE_MARCADOR.map((campo) => ({ valor: campo, texto: ETIQUETAS_DE_CAMPO[campo] })),
    { valor: OPCION_PERSONALIZADA, texto: 'Campo personalizado…' },
  ]

  const valorSeleccionado = origen.tipo === 'campo' ? origen.campo : OPCION_PERSONALIZADA

  return (
    <div className="flex flex-col gap-2">
      <Field id={`${idBase}-campo`} etiqueta="Campo">
        <Select
          opciones={opciones}
          value={valorSeleccionado}
          onChange={(evento) => {
            const valor = evento.target.value
            if (valor === OPCION_PERSONALIZADA) {
              alCambiar({
                tipo: 'personalizado',
                etiqueta: origen.tipo === 'personalizado' ? origen.etiqueta : '',
              })
            } else {
              alCambiar({ tipo: 'campo', campo: valor as CampoDeMarcador })
            }
          }}
        />
      </Field>

      {origen.tipo === 'personalizado' ? (
        <Field id={`${idBase}-etiqueta`} etiqueta="Descripción del campo">
          <Input
            value={origen.etiqueta}
            placeholder="ej. Puntos de la agenda"
            onChange={(evento) => alCambiar({ tipo: 'personalizado', etiqueta: evento.target.value })}
          />
        </Field>
      ) : null}
    </div>
  )
}
