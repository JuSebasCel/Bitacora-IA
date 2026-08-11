import { Insignia } from '@/shared/ui'
import { formatearTimestamp } from '../data'
import type { Ficha } from '../data'
import { TIPO_EN_SINGULAR, TONO_POR_VALIDACION, VALIDACION_EN_SINGULAR } from './vocabulario'

/*
  Las fichas de una conferencia, en el orden en que se dijeron.

  Cada una abre con su coordenada en monoespaciada tabular: es la señal que
  separa el dato verificable del texto interpretado, y lo que permite volver al
  segundo exacto del audio de origen.

  El fragmento se muestra como cita, porque eso es: habla transcrita, no un
  resumen. El contexto mínimo va debajo, en tono secundario, para poder juzgar
  la ficha sin reescuchar la charla.
*/

type PropiedadesListadoDeFichas = {
  fichas: readonly Ficha[]
}

export function ListadoDeFichas({ fichas }: PropiedadesListadoDeFichas) {
  return (
    <ul
      aria-label="Fichas de la conferencia"
      className="divide-y divide-filete border-t border-filete"
    >
      {fichas.map((ficha) => (
        <li key={ficha.id} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[6rem_1fr] sm:gap-5">
          <span className="coordenada text-xs text-texto-tenue">
            {formatearTimestamp(ficha.segundoInicio)}
          </span>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-xs font-medium text-texto">
                {TIPO_EN_SINGULAR[ficha.tipoDeUnidad]}
              </span>
              <Insignia tono={TONO_POR_VALIDACION[ficha.estadoDeValidacion]}>
                {VALIDACION_EN_SINGULAR[ficha.estadoDeValidacion]}
              </Insignia>
              <span className="text-xs text-texto-tenue">{ficha.tema}</span>
            </div>

            <blockquote className="border-l-2 border-filete-fuerte pl-3 text-sm leading-relaxed text-texto">
              {ficha.fragmento}
            </blockquote>

            <p className="text-xs leading-relaxed text-texto-tenue">{ficha.contextoMinimo}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
