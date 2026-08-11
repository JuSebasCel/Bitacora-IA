import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Insignia, Pastilla } from '@/shared/ui'
import type { TonoDeInsignia } from '@/shared/ui'
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
  alCrearYAsignar: (nombre: string) => ResultadoCreacion
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
}: PropiedadesFila) {
  const { conferencia, procedencia } = visible
  const nombreDelDueno = nombreDePersona(conferencia.idDueno)
  const idsPropiasAsignadas = etiquetas
    .filter((visibleDeEtiqueta) => visibleDeEtiqueta.propia)
    .map((visibleDeEtiqueta) => visibleDeEtiqueta.etiqueta.id)

  return (
    <motion.li
      variants={ELEMENTO_DE_FILA}
      className="group relative grid grid-cols-1 gap-2 rounded-md bg-panel px-4 py-5 transition-shadow hover:shadow-sm sm:grid-cols-[9rem_1fr] sm:gap-5"
    >
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-0 w-0.5 scale-y-0 rounded-full bg-acento transition-transform duration-150 group-hover:scale-y-100"
      />

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
          <Insignia tono={TONO_POR_ESTADO[conferencia.estado]}>
            {TEXTO_POR_ESTADO[conferencia.estado]}
          </Insignia>
          <span className="coordenada text-xs text-texto-tenue">
            {textoDeFichas(numeroDeFichas)}
          </span>
          <span className="text-xs text-texto-tenue">
            {procedencia === 'propia'
              ? 'Propia'
              : `Compartida por ${nombreDelDueno ?? 'otra persona'}`}
          </span>
        </div>

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
