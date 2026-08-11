import { Pastilla } from '@/shared/ui'
import type { EtiquetaVisible } from '../tags'

/*
  Las etiquetas puestas sobre una conferencia.

  Las propias llevan control de quitar; las que viajaron con la conferencia
  compartida se ven pero no son de quien mira, así que no lo llevan. La regla
  se aplica igual en el dato (`quitarEtiqueta` rechaza una ajena): aquí solo se
  evita ofrecer un botón que iba a fallar.
*/

type PropiedadesEditor = {
  etiquetas: readonly EtiquetaVisible[]
  alQuitar: (idEtiqueta: string) => void
}

export function EditorDeEtiquetas({ etiquetas, alQuitar }: PropiedadesEditor) {
  if (etiquetas.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {etiquetas.map((visible) =>
        visible.propia ? (
          <Pastilla
            key={visible.etiqueta.id}
            nombre={visible.etiqueta.nombre}
            alQuitar={() => alQuitar(visible.etiqueta.id)}
          />
        ) : (
          <Pastilla key={visible.etiqueta.id} nombre={visible.etiqueta.nombre} ajena />
        ),
      )}
    </div>
  )
}
