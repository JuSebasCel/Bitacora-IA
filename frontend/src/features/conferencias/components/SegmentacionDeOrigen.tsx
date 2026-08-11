import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import type { Segmento } from '../query'

/*
  Filtro por procedencia de la conferencia.

  Son radios reales dentro de un `fieldset` con leyenda, y no botones con
  `aria-pressed`: es una elección entre tres opciones excluyentes, que es
  exactamente lo que un grupo de radios comunica al teclado y al lector de
  pantalla sin que haya que explicárselo.

  El indicador que se desliza detrás de la opción activa usa el mismo
  `layoutId` en una sola instancia a la vez (solo la opción activa lo
  renderiza), así que Motion anima la transición de posición sola, sin medir
  nada a mano.
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
  const idIndicador = useId()
  const reducirMovimiento = useReducedMotion()

  return (
    <fieldset className="flex items-center">
      <legend className="sr-only">Origen</legend>

      <div className="inline-flex w-fit items-center gap-0.5 rounded-md bg-fondo p-0.5">
        {OPCIONES.map((opcion) => {
          const activa = opcion.valor === segmento

          return (
            <label
              key={opcion.valor}
              className={`relative isolate cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                activa ? 'text-acento' : 'text-texto-tenue hover:text-texto'
              }`}
            >
              {activa ? (
                <motion.span
                  layoutId={`indicador-de-origen-${idIndicador}`}
                  className="absolute inset-0 -z-10 rounded-md bg-panel shadow-sm"
                  transition={
                    reducirMovimiento
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 500, damping: 34 }
                  }
                />
              ) : null}
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
