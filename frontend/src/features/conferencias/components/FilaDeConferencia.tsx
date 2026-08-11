import { Link } from 'react-router'
import { Insignia, Pastilla } from '@/shared/ui'
import type { TonoDeInsignia } from '@/shared/ui'
import { formatearFecha, nombreDePersona } from '../data'
import type { EstadoDeProcesamiento } from '../data'
import type { ConferenciaVisible } from '../query'
import type { EtiquetaVisible } from '../tags'

/*
  Una entrada del listado.

  Es una fila con filete y canaleta izquierda, no una tarjeta: la dirección
  visual del proyecto reserva la elevación para donde comunique jerarquía real,
  y aquí lo que importa es poder recorrer muchas conferencias de un vistazo.

  La canaleta lleva la coordenada (fecha y código de charla) en monoespaciada
  tabular, que es la señal que separa el dato verificable del texto interpretado.
*/

type PropiedadesFila = {
  visible: ConferenciaVisible
  etiquetas: readonly EtiquetaVisible[]
  numeroDeFichas: number
  /** Cadena de consulta actual, para volver al listado con los filtros puestos. */
  busqueda: string
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
}: PropiedadesFila) {
  const { conferencia, procedencia } = visible
  const nombreDelDueno = nombreDePersona(conferencia.idDueno)

  return (
    <li className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
      <div className="flex flex-row items-baseline gap-3 sm:flex-col sm:gap-1">
        <span className="coordenada text-xs text-texto-tenue">
          {formatearFecha(conferencia.fechaDelEvento)}
        </span>
        <span className="coordenada text-[0.6875rem] tracking-wide text-texto-tenue uppercase">
          {conferencia.codigoDeEvento}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="text-sm leading-snug font-medium text-texto">
          <Link
            to={{ pathname: `/conferencias/${conferencia.id}`, search: busqueda }}
            className="rounded-md transition-colors hover:text-acento"
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
          elementos devolviera también las etiquetas.
        */}
        {etiquetas.length === 0 ? null : (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {etiquetas.map((visibleDeEtiqueta) => (
              <Pastilla
                key={visibleDeEtiqueta.etiqueta.id}
                nombre={visibleDeEtiqueta.etiqueta.nombre}
              />
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
