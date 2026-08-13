import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactElement } from 'react'
import { useId, useState } from 'react'
import { formatearFecha } from '@/features/conferencias/data'
import { EstadoVacio, Insignia, MensajeDeFormulario } from '@/shared/ui'
import type { TemaPropuesto } from '../data'
import type { ResultadoDeAccion } from '../useTaxonomia'

/*
  Cola de curaduría: los temas que el procesamiento propuso y que todavía no
  entran al pool general (`PLAN.md` 3.1).

  El aviso de duplicado se muestra antes de pulsar, no solo cuando la
  aprobación falla. Aprobar un nombre que ya existe está pensado para fallar,
  pero si la persona se entera al recibir el error, el sistema parece averiado;
  enseñando de antemano con qué tema del pool choca, el rechazo se lee como lo
  que es: exactamente el duplicado que la curaduría existe para atrapar.
*/

export type PropsColaDePropuestas = {
  propuestas: readonly TemaPropuesto[]
  /** Nombre visible del evento que originó la propuesta. */
  nombreDeEvento: (idEvento: string) => string
  /** Nombre del tema del pool con el que chocaría, o null si no choca con ninguno. */
  temaQueChoca: (nombre: string) => string | null
  /** Temas ya activos en ese evento, para poder juzgar si la propuesta agrega algo. */
  temasActivosDelEvento: (idEvento: string) => readonly string[]
  alAprobar: (idPropuesta: string) => ResultadoDeAccion
  alRechazar: (idPropuesta: string) => ResultadoDeAccion
}

type Aviso = {
  readonly idPropuesta: string
  readonly mensaje: string
}

const CLASES_DE_ACCION =
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors'

export function ColaDePropuestas({
  propuestas,
  nombreDeEvento,
  temaQueChoca,
  temasActivosDelEvento,
  alAprobar,
  alRechazar,
}: PropsColaDePropuestas): ReactElement {
  const idTitulo = useId()
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const reducirMovimiento = useReducedMotion()

  function aprobar(propuesta: TemaPropuesto): void {
    const resultado = alAprobar(propuesta.id)

    setAviso(resultado.ok ? null : { idPropuesta: propuesta.id, mensaje: resultado.mensaje })
  }

  function rechazar(propuesta: TemaPropuesto): void {
    const resultado = alRechazar(propuesta.id)

    setAviso(resultado.ok ? null : { idPropuesta: propuesta.id, mensaje: resultado.mensaje })
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className="flex flex-col rounded-md border border-filete bg-panel"
    >
      <header className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={idTitulo} className="text-sm font-semibold text-texto">
            Propuestas por revisar
          </h2>
          {propuestas.length === 0 ? (
            <Insignia tono="validado">Al día</Insignia>
          ) : (
            <Insignia tono="pendiente">
              {propuestas.length === 1 ? '1 sin revisar' : `${propuestas.length} sin revisar`}
            </Insignia>
          )}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-texto-tenue">
          Temas que el procesamiento propuso al no encontrar ninguno activo que encajara. Aprobar
          uno lo suma al pool y lo deja activo en su evento; rechazarlo lo descarta.
        </p>
      </header>

      {propuestas.length === 0 ? (
        <div className="px-4">
          <EstadoVacio
            titulo="Nada esperando curaduría"
            descripcion="Cuando el análisis de una charla no encuentre un tema activo que encaje, propondrá uno aquí y esperará tu revisión antes de sumarlo al vocabulario compartido."
          />
        </div>
      ) : (
        <ul aria-label="Propuestas de tema" className="flex flex-col gap-3 border-t border-filete p-4">
          {/*
            La salida animada de la tarjeta es la única confirmación de que
            aprobar o rechazar surtió efecto: sin ella, la lista simplemente
            tiene un elemento menos y no se sabe cuál se fue.
          */}
          <AnimatePresence initial={false}>
            {propuestas.map((propuesta) => {
              const choque = temaQueChoca(propuesta.nombre)
              const avisoDeLaTarjeta =
                aviso !== null && aviso.idPropuesta === propuesta.id ? aviso.mensaje : null

              return (
                <motion.li
                  key={propuesta.id}
                  layout={!reducirMovimiento}
                  exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, x: 12 }}
                  transition={{ duration: reducirMovimiento ? 0 : 0.2 }}
                  className="flex flex-col gap-2 rounded-md border border-filete bg-fondo p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium break-words text-texto">
                      {propuesta.nombre}
                    </p>
                    {choque === null ? null : <Insignia tono="error">Duplicado</Insignia>}
                  </div>

                  <p className="text-xs text-texto-tenue">
                    {nombreDeEvento(propuesta.idEvento)}
                    <span aria-hidden="true"> · </span>
                    <span className="coordenada">{formatearFecha(propuesta.propuestoEl)}</span>
                  </p>

                  <p className="text-sm leading-relaxed text-texto-tenue">{propuesta.justificacion}</p>

                  {choque === null ? null : (
                    <p className="text-xs leading-relaxed text-texto">
                      El pool ya tiene «{choque}», que es el mismo tema con otras palabras. Rechaza
                      esta propuesta y activa «{choque}» en {nombreDeEvento(propuesta.idEvento)}: dos
                      nombres para lo mismo rompen la comparación entre eventos.
                    </p>
                  )}

                  {/*
                    Los temas ya activos del evento, a la vista de quien decide.

                    La comparación de nombres solo atrapa el duplicado literal,
                    y el que de verdad importa casi nunca lo es: "Sesgos en IA"
                    y "Sesgos algorítmicos" no chocan como cadenas, pero son el
                    mismo tema, y aprobar el segundo parte en dos la
                    comparabilidad entre eventos que la taxonomía existe para
                    sostener. Eso solo lo puede juzgar una persona, y no puede
                    juzgarlo si no ve contra qué está comparando: sin esta
                    lista, aprobar o rechazar era a ciegas.
                  */}
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                    <span className="text-xs text-texto-tenue">Ya activos aquí:</span>
                    {temasActivosDelEvento(propuesta.idEvento).length === 0 ? (
                      <span className="text-xs text-texto-tenue">ninguno todavía.</span>
                    ) : (
                      temasActivosDelEvento(propuesta.idEvento).map((nombre) => (
                        <span key={nombre} className="rounded-md bg-panel px-1.5 py-0.5 text-xs text-texto-tenue">
                          {nombre}
                        </span>
                      ))
                    )}
                  </div>

                  {avisoDeLaTarjeta === null ? null : (
                    <MensajeDeFormulario id={`propuesta-${propuesta.id}-error`}>
                      {avisoDeLaTarjeta}
                    </MensajeDeFormulario>
                  )}

                  {/*
                    Botones propios y no el primitivo `Button`: aquí las dos
                    acciones son opuestas y de igual peso, y hay que poder teñir
                    la de rechazo con el token de error sin inventarle una
                    variante nueva al primitivo por un solo uso.

                    El nombre de la propuesta va en el nombre accesible y no en
                    el texto visible: en una cola de varias tarjetas, "Aprobar"
                    a secas no dice cuál, pero repetirlo en pantalla duplicaría
                    el título que está tres líneas más arriba.
                  */}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => rechazar(propuesta)}
                      aria-label={`Rechazar la propuesta «${propuesta.nombre}»`}
                      className={`${CLASES_DE_ACCION} border-transparent text-texto-tenue hover:border-error-borde hover:text-error`}
                    >
                      <XIcon size={13} weight="bold" aria-hidden="true" />
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => aprobar(propuesta)}
                      aria-label={`Aprobar la propuesta «${propuesta.nombre}»`}
                      className={`${CLASES_DE_ACCION} border-filete-fuerte bg-panel text-texto hover:border-acento hover:text-acento`}
                    >
                      <CheckIcon size={13} weight="bold" aria-hidden="true" />
                      Aprobar
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
