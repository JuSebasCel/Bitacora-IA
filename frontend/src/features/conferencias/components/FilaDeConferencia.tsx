import { EyeSlashIcon } from '@phosphor-icons/react/dist/csr/EyeSlash'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Insignia, Pastilla } from '@/shared/ui'
import type { TonoDeInsignia } from '@/shared/ui'
import { progresoDe } from '../carga'
import { formatearFecha, nombreDePersona } from '../data'
import type { Etiqueta, EstadoDeProcesamiento } from '../data'
import type { ConferenciaVisible } from '../query'
import type { EtiquetaVisible } from '../tags'
import { ELEMENTO_DE_FILA } from './animaciones'
import { AsignadorDeEtiquetas } from './AsignadorDeEtiquetas'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'

/*
  Una entrada del listado.

  Cada fila es su propia superficie (`bg-panel`, siempre visible, no solo en
  hover): sin eso, la separación dependía por completo de pasar el mouse, y
  quieta la lista se leía como un bloque continuo de texto en vez de registros
  distintos. El hover ya no tiene que inventar el contraste desde cero, solo lo
  acentúa (sombra y barra de acento).

  La canaleta lleva la coordenada (fecha y código de charla) en monoespaciada
  tabular, que es la señal que separa el dato verificable del texto interpretado.

  Toda la fila navega al detalle, no solo el título: el enlace del título se
  extiende con un `::after` absoluto que cubre el `<li>` entero (el truco del
  "stretched link"). Sigue siendo un único `<a>` con un solo nombre accesible,
  así que un lector de pantalla no ve nada raro; lo único que cambia es el área
  donde el clic cuenta. Nada más en la fila es interactivo, así que no hay
  ningún control que ese enlace invisible pueda tapar.
*/

type PropiedadesFila = {
  visible: ConferenciaVisible
  etiquetas: readonly EtiquetaVisible[]
  numeroDeFichas: number
  /** Cadena de consulta actual, para volver al listado con los filtros puestos. */
  busqueda: string
  /** Todas las etiquetas propias de quien mira, para el selector de asignación. */
  misEtiquetas: readonly Etiqueta[]
  alAlternarAsignacion: (idEtiqueta: string) => void
  alCrearYAsignar: (nombre: string) => ResultadoCreacion | Promise<ResultadoCreacion>
  /** Quita esta conferencia del propio listado, propia o compartida. Ver `ocultas/`. */
  alOcultar: () => void
}

const TONO_POR_ESTADO: Record<EstadoDeProcesamiento, TonoDeInsignia> = {
  'en-cola': 'neutro',
  procesando: 'neutro',
  procesada: 'validado',
  fallida: 'error',
}

const TEXTO_POR_ESTADO: Record<EstadoDeProcesamiento, string> = {
  'en-cola': 'En cola',
  procesando: 'Procesando',
  procesada: 'Procesada',
  fallida: 'Procesamiento interrumpido',
}

function textoDeFichas(numeroDeFichas: number): string {
  return numeroDeFichas === 1 ? '1 ficha' : `${numeroDeFichas} fichas`
}

export function FilaDeConferencia({
  visible,
  etiquetas,
  numeroDeFichas,
  busqueda,
  misEtiquetas,
  alAlternarAsignacion,
  alCrearYAsignar,
  alOcultar,
}: PropiedadesFila) {
  const { conferencia, procedencia } = visible
  const nombreDelDueno = nombreDePersona(conferencia.idDueno)
  const idsPropiasAsignadas = etiquetas
    .filter((visibleDeEtiqueta) => visibleDeEtiqueta.propia)
    .map((visibleDeEtiqueta) => visibleDeEtiqueta.etiqueta.id)

  const reducirMovimiento = useReducedMotion()
  const { cargadaEl } = conferencia
  const [progreso, setProgreso] = useState(() =>
    cargadaEl === undefined ? 100 : progresoDe(cargadaEl, Date.now()),
  )

  /*
    Solo las conferencias cargadas en esta sesión traen `cargadaEl`; las del
    fixture no avanzan solas. El intervalo se apaga solo al llegar a 100, no
    hace falta desmontar nada más.
  */
  useEffect(() => {
    if (cargadaEl === undefined || progreso >= 100) {
      return
    }

    const intervalo = setInterval(() => {
      setProgreso(progresoDe(cargadaEl, Date.now()))
    }, 250)

    return () => clearInterval(intervalo)
  }, [cargadaEl, progreso])

  const enProcesamiento = cargadaEl !== undefined && progreso < 100
  const estadoMostrado: EstadoDeProcesamiento =
    cargadaEl !== undefined && progreso >= 100 ? 'procesada' : conferencia.estado

  return (
    <motion.li
      variants={ELEMENTO_DE_FILA}
      className="group relative grid grid-cols-1 gap-2 rounded-md bg-panel px-4 py-5 transition-shadow hover:shadow-sm sm:grid-cols-[9rem_1fr] sm:gap-5"
    >
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-0 w-0.5 scale-y-0 rounded-full bg-acento transition-transform duration-150 group-hover:scale-y-100"
      />

      {/*
        Fantasma hasta que se necesita: visible siempre para quien navega con
        teclado (group-focus-within) y al pasar el mouse, para no ensuciar la
        fila con un icono que casi nunca se usa. `z-10` es obligatorio: sin
        eso, el `::after` del enlace del título (el "stretched link" que cubre
        toda la fila) le tapa el clic.
      */}
      <button
        type="button"
        onClick={alOcultar}
        aria-label={`Quitar «${conferencia.titulo}» de tu listado`}
        className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-texto-tenue opacity-0 transition-colors hover:bg-fondo hover:text-texto focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <EyeSlashIcon size={15} weight="regular" aria-hidden="true" />
      </button>

      <div className="flex flex-row items-baseline gap-3 sm:flex-col sm:gap-1">
        <span className="coordenada text-xs text-texto-tenue">
          {formatearFecha(conferencia.fechaDelEvento)}
        </span>
        <span className="coordenada text-[0.6875rem] tracking-wide text-texto-tenue uppercase">
          {conferencia.codigoDeEvento}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-lg leading-snug font-medium tracking-tight text-texto">
          <Link
            to={{ pathname: `/conferencias/${conferencia.id}`, search: busqueda }}
            className="rounded-md transition-colors after:absolute after:inset-0 group-hover:text-acento"
          >
            {conferencia.titulo}
          </Link>
        </h2>

        <p className="text-sm text-texto-tenue">
          {conferencia.ponente}
          {' · '}
          {conferencia.evento}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
          <Insignia tono={TONO_POR_ESTADO[estadoMostrado]}>{TEXTO_POR_ESTADO[estadoMostrado]}</Insignia>
          <span className="coordenada text-xs text-texto-tenue">
            {textoDeFichas(numeroDeFichas)}
          </span>
          <span className="text-xs text-texto-tenue">
            {procedencia === 'propia'
              ? 'Propia'
              : `Compartida por ${nombreDelDueno ?? 'otra persona'}`}
          </span>
        </div>

        <AnimatePresence>
          {enProcesamiento ? (
            <motion.div
              exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div
                role="progressbar"
                aria-label={`Procesando «${conferencia.titulo}»`}
                aria-valuenow={progreso}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-fondo"
              >
                <div
                  className="h-full rounded-full bg-acento transition-[width] duration-300 ease-linear"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/*
          Las pastillas van en un div y no en una lista anidada: el listado de
          conferencias ya es una lista, y anidar otra haría que contar sus
          elementos devolviera también las etiquetas. El disparador de asignar
          vive en el mismo renglón, siempre, incluso sin ninguna etiqueta
          puesta todavía: es la única forma de llegar a ponerla.
        */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {etiquetas.map((visibleDeEtiqueta) => (
            <Pastilla
              key={visibleDeEtiqueta.etiqueta.id}
              nombre={visibleDeEtiqueta.etiqueta.nombre}
              ajena={!visibleDeEtiqueta.propia}
            />
          ))}

          <AsignadorDeEtiquetas
            misEtiquetas={misEtiquetas}
            idsAsignadas={idsPropiasAsignadas}
            alAlternar={alAlternarAsignacion}
            alCrear={alCrearYAsignar}
          />
        </div>
      </div>
    </motion.li>
  )
}
