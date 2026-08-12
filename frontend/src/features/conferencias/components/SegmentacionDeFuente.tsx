import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import type { FuenteDeConferencia } from '../data'

/*
  Elige entre audio y transcripción, que decide qué archivo acepta el paso
  siguiente. Mismo patrón de `SegmentacionDeOrigen` (F2): radios reales en un
  `fieldset`, indicador deslizante con `layoutId`. No se generaliza en un
  primitivo compartido: son solo estos dos usos hoy.
*/

type PropiedadesSegmentacion = {
  fuente: FuenteDeConferencia
  alCambiar: (fuente: FuenteDeConferencia) => void
}

const OPCIONES: readonly { valor: FuenteDeConferencia; texto: string }[] = [
  { valor: 'audio', texto: 'Audio' },
  { valor: 'transcripcion', texto: 'Transcripción' },
]

export function SegmentacionDeFuente({ fuente, alCambiar }: PropiedadesSegmentacion) {
  const idIndicador = useId()
  const reducirMovimiento = useReducedMotion()

  return (
    <fieldset className="flex items-center">
      <legend className="sr-only">Fuente</legend>

      <div className="inline-flex w-fit items-center gap-0.5 rounded-md bg-fondo p-0.5">
        {OPCIONES.map((opcion) => {
          const activa = opcion.valor === fuente

          return (
            <label
              key={opcion.valor}
              className={`relative isolate cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                activa ? 'text-acento' : 'text-texto-tenue hover:text-texto'
              }`}
            >
              {activa ? (
                <motion.span
                  layoutId={`indicador-de-fuente-${idIndicador}`}
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
                name="fuente"
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
