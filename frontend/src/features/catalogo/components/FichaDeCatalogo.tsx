import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { formatearFecha, formatearTimestamp } from '@/features/conferencias/data'
import { TIPO_EN_SINGULAR, TONO_POR_VALIDACION, VALIDACION_EN_SINGULAR } from '@/features/conferencias/components/vocabulario'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { Insignia } from '@/shared/ui'

export type PropsFichaDeCatalogo = {
  entrada: FichaDelCatalogo
}

/*
  Resultado del catálogo: mismo contenido de fila que `ListadoDeFichas.tsx`
  (coordenada, tipo, insignia de estado, tema, cita, contexto), más lo que
  esa pantalla no necesita mostrar porque ya vive dentro de una sola
  conferencia — de cuál conferencia, ponente y evento viene esta ficha. Se
  enlaza a esa conferencia, no a la ficha (no existe todavía ninguna ruta ni
  ancla por ficha individual en la app).

  Mismo lenguaje visual de hover que `FilaDeConferencia.tsx`/
  `TarjetaDeMemoria.tsx`: barra de acento a la izquierda, sombra que se
  acentúa, el título de la conferencia pasa a color de acento.
*/
export function FichaDeCatalogo({ entrada }: PropsFichaDeCatalogo): ReactElement {
  const { ficha, conferencia } = entrada

  return (
    <div className="group relative flex flex-col gap-3 rounded-md bg-panel p-4 shadow-sm transition-shadow hover:shadow-md">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-0 w-0.5 scale-y-0 rounded-full bg-acento transition-transform duration-150 group-hover:scale-y-100"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[6rem_1fr] sm:gap-5">
        <span className="coordenada text-xs text-texto-tenue">{formatearTimestamp(ficha.segundoInicio)}</span>

        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-medium text-texto">{TIPO_EN_SINGULAR[ficha.tipoDeUnidad]}</span>
            <Insignia tono={TONO_POR_VALIDACION[ficha.estadoDeValidacion]}>
              {VALIDACION_EN_SINGULAR[ficha.estadoDeValidacion]}
            </Insignia>
            <span className="text-xs text-texto-tenue">{ficha.tema}</span>
          </div>

          <blockquote className="border-l-2 border-acento/50 pl-3 text-base leading-relaxed text-texto">
            {ficha.fragmento}
          </blockquote>

          <p className="text-xs leading-relaxed text-texto-tenue">{ficha.contextoMinimo}</p>

          <p className="text-sm text-texto-tenue">
            <Link
              to={`/conferencias/${conferencia.id}`}
              className="font-medium text-texto transition-colors after:absolute after:inset-0 group-hover:text-acento"
            >
              {conferencia.titulo}
            </Link>
            {' · '}
            {conferencia.ponente}
            {' · '}
            {conferencia.evento}
            {' · '}
            {formatearFecha(conferencia.fechaDelEvento)}
          </p>
        </div>
      </div>
    </div>
  )
}
