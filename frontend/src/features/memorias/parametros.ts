import { CRITERIOS_POR_DEFECTO } from './filtros'
import type { CriteriosDeMemorias } from './filtros'

/*
  Traducción entre los criterios de memorias y la cadena de consulta de la
  URL, mismo criterio que `catalogo/parametros.ts`: los filtros viven en la
  URL, no en estado de React, para que una vista filtrada se pueda compartir
  como enlace y sobreviva a un recargado.

  La entrada es texto que cualquiera puede escribir a mano. Nada de aquí
  lanza.
*/

const PARAMETRO_BUSQUEDA = 'buscar'

/*
  `PantallaMemorias` ya usa `?conferencia=<id>` para preseleccionar una
  conferencia al abrir el panel de generar (punto de entrada desde el
  detalle de una conferencia específica). Ese parámetro no es un criterio
  de búsqueda, así que se conserva tal cual si ya estaba en la URL, en vez de
  perderse cada vez que se escribe en la barra de búsqueda.
*/
const PARAMETRO_CONFERENCIA_PRESELECCIONADA = 'conferencia'

export function leerCriteriosDeMemorias(params: URLSearchParams): CriteriosDeMemorias {
  return {
    busqueda: params.get(PARAMETRO_BUSQUEDA)?.trim() ?? CRITERIOS_POR_DEFECTO.busqueda,
  }
}

/*
  Omite la búsqueda cuando vale su valor por defecto, para que la URL sin
  filtrar sea `/memorias` a secas y no un rastro de parámetros redundantes.
  `paramsAnteriores` es opcional para poder llamarla también fuera de un
  cambio sobre la URL existente (por ejemplo, al escribir los criterios por
  defecto desde cero).
*/
export function escribirCriteriosDeMemorias(
  criterios: CriteriosDeMemorias,
  paramsAnteriores?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams()

  const busqueda = criterios.busqueda.trim()
  if (busqueda.length > 0) {
    params.set(PARAMETRO_BUSQUEDA, busqueda)
  }

  const conferenciaPreseleccionada = paramsAnteriores?.get(PARAMETRO_CONFERENCIA_PRESELECCIONADA)?.trim()
  if (conferenciaPreseleccionada !== undefined && conferenciaPreseleccionada.length > 0) {
    params.set(PARAMETRO_CONFERENCIA_PRESELECCIONADA, conferenciaPreseleccionada)
  }

  return params
}
