import type { Segmento } from '../query'

/*
  Filtro por procedencia de la conferencia.

  Son radios reales dentro de un `fieldset` con leyenda, y no botones con
  `aria-pressed`: es una elección entre tres opciones excluyentes, que es
  exactamente lo que un grupo de radios comunica al teclado y al lector de
  pantalla sin que haya que explicárselo.
*/

type PropiedadesSegmentacion = {
  segmento: Segmento
  alCambiar: (segmento: Segmento) => void
}

const OPCIONES: readonly { valor: Segmento; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'propias', texto: 'Mías' },
  { valor: 'compartidas', texto: 'Compartidas conmigo' },
]

export function SegmentacionDeOrigen({ segmento, alCambiar }: PropiedadesSegmentacion) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium text-texto">Origen</legend>

      <div className="flex flex-wrap gap-1">
        {OPCIONES.map((opcion) => {
          const activa = opcion.valor === segmento

          return (
            <label
              key={opcion.valor}
              className={`cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors ${
                activa
                  ? 'border-acento bg-acento-tenue font-medium text-acento'
                  : 'border-filete-fuerte text-texto-tenue hover:border-acento hover:text-acento'
              }`}
            >
              <input
                type="radio"
                name="origen"
                value={opcion.valor}
                checked={activa}
                onChange={() => alCambiar(opcion.valor)}
                className="sr-only"
              />
              {opcion.texto}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
