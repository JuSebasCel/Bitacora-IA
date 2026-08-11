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
              className={`relative cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                activa
                  ? 'border-acento bg-acento-tenue font-medium text-acento'
                  : 'border-filete-fuerte text-texto-tenue hover:border-acento hover:text-acento'
              }`}
            >
              {/*
                El control nativo se hace transparente y cubre toda la etiqueta,
                en vez de esconderse con `sr-only` en un rincón de un píxel.
                Escondido, el punto donde hay que pulsar queda tapado por la
                propia etiqueta: el teclado y el lector de pantalla funcionaban,
                pero un clic dirigido al control lo interceptaba la etiqueta.
                Así el control sigue siendo nativo y además es lo que se pulsa.
              */}
              <input
                type="radio"
                name="origen"
                value={opcion.valor}
                checked={activa}
                onChange={() => alCambiar(opcion.valor)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              {opcion.texto}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
