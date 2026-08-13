import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'
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

  Cada ficha es su propio bloque hundido (`bg-fondo`), no una fila de una
  lista continua: son entradas independientes del mismo origen, y encerrarlas
  por separado se lee así en vez de como un único texto largo cortado por
  líneas.
*/

type PropiedadesListadoDeFichas = {
  fichas: readonly Ficha[]
  /*
    La ficha guarda el id del tema, así que el nombre hay que resolverlo.
    Aquí llega el pool y se resuelve fila a fila con `nombreDeTema` (el único
    resolutor del proyecto): pasar un nombre por prop, como hace
    `catalogo/components/FichaDeCatalogo.tsx`, obligaría al contenedor a
    recorrer las mismas fichas otra vez solo para armar esa lista.
  */
  temas: readonly Tema[]
  /** Si la conferencia es ajena y su dueño eligió no mostrar las fichas pendientes. */
  ocultaPendientes?: boolean
  /**
   * Si esta persona puede marcar una ficha de esta conferencia como
   * validada (F8): siempre para el dueño, y para un invitado solo cuando
   * `permitirValidarFichas` está activo. Se resuelve en la pantalla, que sí
   * conoce la privacidad efectiva; este componente solo obedece la bandera.
   */
  puedeValidar?: boolean
  alValidar?: (idFicha: string) => void
}

export function ListadoDeFichas({
  fichas,
  temas,
  ocultaPendientes = false,
  puedeValidar = false,
  alValidar,
}: PropiedadesListadoDeFichas) {
  /*
    Llegar a cero fichas no siempre significa lo mismo, y decir lo mismo en
    los dos casos manda a la persona a conclusiones equivocadas: en una
    conferencia compartida que solo muestra fichas validadas, el vacío no es
    que la charla no produjera nada, sino que lo que produjo está en revisión
    y su dueño eligió no compartirlo todavía.
  */
  if (fichas.length === 0) {
    return (
      <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">
        {ocultaPendientes
          ? 'Esta conferencia todavía no tiene fichas validadas. Quien la compartió eligió mostrar solo las ya revisadas, así que las que siguen en revisión no aparecen aquí.'
          : 'El procesamiento de esta conferencia terminó sin extraer ninguna ficha.'}
      </p>
    )
  }

  return (
    <ul aria-label="Fichas de la conferencia" className="flex flex-col gap-3">
      {fichas.map((ficha) => (
        <li
          key={ficha.id}
          className="grid grid-cols-1 gap-3 rounded-md bg-fondo p-4 sm:grid-cols-[6rem_1fr] sm:gap-5"
        >
          <span className="coordenada text-xs text-texto-tenue">
            {formatearTimestamp(ficha.segundoInicio)}
          </span>

          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm font-medium text-texto">
                {TIPO_EN_SINGULAR[ficha.tipoDeUnidad]}
              </span>
              <Insignia tono={TONO_POR_VALIDACION[ficha.estadoDeValidacion]}>
                {VALIDACION_EN_SINGULAR[ficha.estadoDeValidacion]}
              </Insignia>
              <span className="text-xs text-texto-tenue">Tema: {nombreDeTema(temas, ficha.idTema)}</span>

              {/*
                Primera pantalla de la app que deja cambiar el estado de
                validación de una ficha: antes de F8 no existía ningún lugar
                donde alguien, ni siquiera el dueño de su propia conferencia,
                pudiera hacerlo.
              */}
              {puedeValidar && ficha.estadoDeValidacion !== 'validada' ? (
                <button
                  type="button"
                  onClick={() => alValidar?.(ficha.id)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-texto-tenue transition-colors hover:bg-validado/12 hover:text-validado"
                >
                  <CheckCircleIcon size={14} weight="regular" aria-hidden="true" />
                  Marcar como validada
                </button>
              ) : null}
            </div>

            <blockquote className="border-l-2 border-acento/50 pl-3 text-base leading-relaxed text-texto">
              {ficha.fragmento}
            </blockquote>

            <p className="text-xs leading-relaxed text-texto-tenue">{ficha.contextoMinimo}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
