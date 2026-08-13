/*
  Cuánto pidió la persona ("las 5 mejores", "todas", "dame 3 fichas").

  Reconocimiento de patrones conocidos en español, no comprensión real del
  lenguaje: mismo criterio honesto que el resto del módulo. Sin coincidencia,
  se usa un tope por defecto en vez de mandar todo el catálogo de una vez.
*/

export type CantidadSolicitada = { readonly tipo: 'todas' } | { readonly tipo: 'numero'; readonly n: number } | { readonly tipo: 'por-defecto' }

export const CANTIDAD_POR_DEFECTO = 5
const CANTIDAD_MAXIMA_RECONOCIDA = 20

export function extraerCantidadSolicitada(pregunta: string): CantidadSolicitada {
  const normalizado = pregunta.toLowerCase()

  if (/\btodas\b|\btodo\b|\btodos\b/.test(normalizado)) {
    return { tipo: 'todas' }
  }

  const conNumero = normalizado.match(/\b(\d{1,2})\b/)
  if (conNumero !== null) {
    const n = Number(conNumero[1])
    if (n >= 1 && n <= CANTIDAD_MAXIMA_RECONOCIDA) {
      return { tipo: 'numero', n }
    }
  }

  return { tipo: 'por-defecto' }
}

/** `Infinity` para "todas": nunca se usa como longitud de un arreglo real, solo para comparar. */
export function limiteDe(cantidad: CantidadSolicitada): number {
  if (cantidad.tipo === 'todas') {
    return Number.POSITIVE_INFINITY
  }

  if (cantidad.tipo === 'numero') {
    return cantidad.n
  }

  return CANTIDAD_POR_DEFECTO
}
