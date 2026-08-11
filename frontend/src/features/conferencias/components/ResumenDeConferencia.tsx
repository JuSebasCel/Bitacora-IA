import { formatearDuracion, formatearFecha, nombreDePersona } from '../data'
import type { ConferenciaVisible } from '../query'

/*
  Cabecera del detalle: quién habló, en qué evento, cuándo y por cuánto tiempo.

  La coordenada (fecha, código de charla y duración) va en monoespaciada
  tabular, igual que en el listado, para que sea la misma señal en las dos
  pantallas.
*/

type PropiedadesResumen = {
  visible: ConferenciaVisible
}

export function ResumenDeConferencia({ visible }: PropiedadesResumen) {
  const { conferencia, procedencia } = visible
  const nombreDelDueno = nombreDePersona(conferencia.idDueno)

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg leading-snug font-medium tracking-tight text-texto">
        {conferencia.titulo}
      </h1>

      <p className="text-sm text-texto">{conferencia.ponente}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-sm text-texto-tenue">{conferencia.evento}</span>
        <span className="coordenada text-xs tracking-wide text-texto-tenue uppercase">
          {conferencia.codigoDeEvento}
        </span>
        <span className="coordenada text-xs text-texto-tenue">
          {formatearFecha(conferencia.fechaDelEvento)}
        </span>
        <span className="coordenada text-xs text-texto-tenue">
          {formatearDuracion(conferencia.duracionEnSegundos)}
        </span>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">{conferencia.resumen}</p>

      {procedencia === 'compartida' ? (
        <p className="text-xs text-texto-tenue">
          {`Compartida por ${nombreDelDueno ?? 'otra persona'}`}
        </p>
      ) : null}
    </div>
  )
}
