import type { TipoDeUnidad } from '@/features/conferencias/data'
import { CRITERIOS_POR_DEFECTO } from './filtros'
import type { CriteriosDeCatalogo, FiltroDeEstadoDeValidacion } from './filtros'

/*
  Traducción entre los criterios del catálogo y la cadena de consulta de la
  URL — mismo criterio que `conferencias/query/parametros.ts`: los filtros
  viven en la URL, no en estado de React ni en `sessionStorage`, para que una
  vista filtrada se pueda compartir como enlace y sobreviva a un recargado.

  La entrada es texto que cualquiera puede escribir a mano. Nada de aquí
  lanza. Un valor que no se reconoce cae al valor por defecto.
*/

const PARAMETRO = {
  busqueda: 'buscar',
  tema: 'tema',
  tipoDeUnidad: 'tipo',
  evento: 'evento',
  estado: 'estado',
} as const

const TIPOS_DE_UNIDAD: readonly TipoDeUnidad[] = [
  'cita-textual',
  'metodo',
  'estrategia',
  'postura',
  'dato-de-impacto',
  'fase-del-trabajo',
]

const ESTADOS: readonly FiltroDeEstadoDeValidacion[] = ['todos', 'validada', 'pendiente', 'automatica']

function valorConocido<T extends string>(candidato: string | null, permitidos: readonly T[], porDefecto: T): T {
  return permitidos.find((permitido) => permitido === candidato) ?? porDefecto
}

function esTipoDeUnidad(valor: string): valor is TipoDeUnidad {
  return (TIPOS_DE_UNIDAD as readonly string[]).includes(valor)
}

/*
  Tema y evento son texto libre (no un enum fijo, a diferencia de tipo de
  unidad y estado), así que se validan contra la lista de valores realmente
  presentes en lo que esa persona puede ver — mismo criterio que las
  etiquetas de F2, que se descartan si no existen en el espacio de quien
  abre el enlace. `conocidos` es opcional para poder leer la URL antes de
  tener cargado el catálogo, sin perder el valor por el camino.
*/
function leerValorLibre(crudo: string | null, conocidos?: readonly string[]): string | null {
  if (crudo === null) {
    return null
  }

  const valor = crudo.trim()

  if (valor.length === 0) {
    return null
  }

  if (conocidos !== undefined && !conocidos.includes(valor)) {
    return null
  }

  return valor
}

export function leerCriteriosDeCatalogo(
  params: URLSearchParams,
  temasConocidos?: readonly string[],
  eventosConocidos?: readonly string[],
): CriteriosDeCatalogo {
  const tipoCrudo = params.get(PARAMETRO.tipoDeUnidad)

  return {
    busqueda: params.get(PARAMETRO.busqueda)?.trim() ?? CRITERIOS_POR_DEFECTO.busqueda,
    tema: leerValorLibre(params.get(PARAMETRO.tema), temasConocidos),
    tipoDeUnidad: tipoCrudo !== null && esTipoDeUnidad(tipoCrudo) ? tipoCrudo : null,
    evento: leerValorLibre(params.get(PARAMETRO.evento), eventosConocidos),
    estado: valorConocido(params.get(PARAMETRO.estado), ESTADOS, CRITERIOS_POR_DEFECTO.estado),
  }
}

/*
  Omite todo lo que valga su valor por defecto, para que la URL sin filtrar
  sea `/catalogo` a secas y no un rastro de parámetros redundantes.
*/
export function escribirCriteriosDeCatalogo(criterios: CriteriosDeCatalogo): URLSearchParams {
  const params = new URLSearchParams()

  const busqueda = criterios.busqueda.trim()
  if (busqueda.length > 0) {
    params.set(PARAMETRO.busqueda, busqueda)
  }

  if (criterios.tema !== null) {
    params.set(PARAMETRO.tema, criterios.tema)
  }

  if (criterios.tipoDeUnidad !== null) {
    params.set(PARAMETRO.tipoDeUnidad, criterios.tipoDeUnidad)
  }

  if (criterios.evento !== null) {
    params.set(PARAMETRO.evento, criterios.evento)
  }

  if (criterios.estado !== CRITERIOS_POR_DEFECTO.estado) {
    params.set(PARAMETRO.estado, criterios.estado)
  }

  return params
}
