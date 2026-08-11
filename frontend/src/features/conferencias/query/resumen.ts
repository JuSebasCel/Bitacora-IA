import type { EstadoDeValidacion, Ficha, TipoDeUnidad } from '../data'

/*
  Conteos de fichas para el detalle de una conferencia.

  Se calcula siempre sobre las fichas que esa persona puede ver, nunca sobre el
  total real. Si contara el total, el número delataría cuántas fichas esconde
  una compartición que decidió no mostrar las pendientes, y la opción de
  privacidad quedaría anulada por un contador.
*/

export type ConteoPorEstado = Readonly<Record<EstadoDeValidacion, number>>
export type ConteoPorTipo = Readonly<Record<TipoDeUnidad, number>>

export type ResumenDeFichas = {
  readonly total: number
  readonly porEstado: ConteoPorEstado
  readonly porTipo: ConteoPorTipo
}

/*
  Los seis tipos se declaran en cero de entrada, en vez de aparecer solo cuando
  hay alguno. Un tipo ausente es información sobre la charla, así que la
  pantalla necesita poder mostrar el cero.
*/
function conteoInicialPorTipo(): Record<TipoDeUnidad, number> {
  return {
    'cita-textual': 0,
    metodo: 0,
    estrategia: 0,
    postura: 0,
    'dato-de-impacto': 0,
    'fase-del-trabajo': 0,
  }
}

function conteoInicialPorEstado(): Record<EstadoDeValidacion, number> {
  return { validada: 0, pendiente: 0, automatica: 0 }
}

export function resumirFichas(fichas: readonly Ficha[]): ResumenDeFichas {
  const porEstado = conteoInicialPorEstado()
  const porTipo = conteoInicialPorTipo()

  for (const ficha of fichas) {
    porEstado[ficha.estadoDeValidacion] += 1
    porTipo[ficha.tipoDeUnidad] += 1
  }

  return { total: fichas.length, porEstado, porTipo }
}
