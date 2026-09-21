import { CRITERIOS_POR_DEFECTO } from './filtros'
import type {
  CriteriosDeListado,
  FiltroDeEstado,
  OrdenDeEventos,
  OrdenDeFichas,
  OrdenDeListado,
  Segmento,
} from './filtros'

/*
  Traducción entre los criterios del listado y la cadena de consulta de la URL.

  Los filtros del dashboard viven en la URL, no en estado de React ni en
  almacenamiento del navegador (PLAN.md sección 7): así una vista filtrada se
  comparte como enlace, sobrevive a un recargado y se conserva al volver desde
  el detalle. En este proyecto `sessionStorage` guarda datos del usuario, no
  estado de vista, y mezclarlos haría que dos pestañas peleen por el mismo
  filtro.

  Consecuencia directa: la entrada es texto que cualquiera puede escribir a
  mano. Nada de aquí lanza. Un valor que no se reconoce cae al valor por
  defecto y la pantalla sigue funcionando.
*/

const PARAMETRO = {
  segmento: 'segmento',
  busqueda: 'buscar',
  estado: 'estado',
  etiquetas: 'etiquetas',
  orden: 'orden',
  ordenDeEventos: 'orden-eventos',
  ordenDeFichas: 'orden-fichas',
} as const

const SEGMENTOS: readonly Segmento[] = ['todas', 'propias', 'compartidas']

const ESTADOS: readonly FiltroDeEstado[] = [
  'todos',
  'en-cola',
  'procesando',
  'procesada',
  'fallida',
]

const ORDENES: readonly OrdenDeListado[] = ['fecha-desc', 'fecha-asc', 'titulo-asc', 'fichas-desc']
const ORDENES_DE_EVENTOS: readonly OrdenDeEventos[] = ['recientes', 'antiguos', 'alfabetico']
const ORDENES_DE_FICHAS: readonly OrdenDeFichas[] = ['charla', 'tema', 'tipo']

function valorConocido<T extends string>(
  candidato: string | null,
  permitidos: readonly T[],
  porDefecto: T,
): T {
  return permitidos.find((permitido) => permitido === candidato) ?? porDefecto
}

/*
  Las etiquetas son privadas, así que un enlace filtrado que viaja de una
  persona a otra trae identificadores que no existen en el espacio de quien lo
  abre. Descartarlos es lo correcto, y no un error que merezca código propio:
  la pantalla lo avisa con una línea discreta.

  `conocidas` es opcional para poder leer la URL antes de tener cargado el
  espacio de etiquetas, sin perder los identificadores por el camino.
*/
function leerEtiquetas(crudo: string | null, conocidas?: readonly string[]): readonly string[] {
  if (crudo === null) {
    return []
  }

  const ids: string[] = []

  for (const parte of crudo.split(',')) {
    const id = parte.trim()

    if (id.length === 0 || ids.includes(id)) {
      continue
    }

    if (conocidas !== undefined && !conocidas.includes(id)) {
      continue
    }

    ids.push(id)
  }

  return ids
}

export function leerCriterios(
  params: URLSearchParams,
  etiquetasConocidas?: readonly string[],
): CriteriosDeListado {
  return {
    segmento: valorConocido(
      params.get(PARAMETRO.segmento),
      SEGMENTOS,
      CRITERIOS_POR_DEFECTO.segmento,
    ),
    busqueda: params.get(PARAMETRO.busqueda)?.trim() ?? CRITERIOS_POR_DEFECTO.busqueda,
    estado: valorConocido(params.get(PARAMETRO.estado), ESTADOS, CRITERIOS_POR_DEFECTO.estado),
    etiquetas: leerEtiquetas(params.get(PARAMETRO.etiquetas), etiquetasConocidas),
    orden: valorConocido(params.get(PARAMETRO.orden), ORDENES, CRITERIOS_POR_DEFECTO.orden),
    ordenDeEventos: valorConocido(
      params.get(PARAMETRO.ordenDeEventos),
      ORDENES_DE_EVENTOS,
      CRITERIOS_POR_DEFECTO.ordenDeEventos,
    ),
    ordenDeFichas: valorConocido(
      params.get(PARAMETRO.ordenDeFichas),
      ORDENES_DE_FICHAS,
      CRITERIOS_POR_DEFECTO.ordenDeFichas,
    ),
  }
}

/*
  Omite todo lo que valga su valor por defecto. La URL del dashboard sin
  filtrar es la que más se ve y la que la gente copia, así que conviene que sea
  `/conferencias` a secas y no un rastro de parámetros redundantes.
*/
export function escribirCriterios(criterios: CriteriosDeListado): URLSearchParams {
  const params = new URLSearchParams()

  if (criterios.segmento !== CRITERIOS_POR_DEFECTO.segmento) {
    params.set(PARAMETRO.segmento, criterios.segmento)
  }

  const busqueda = criterios.busqueda.trim()

  if (busqueda.length > 0) {
    params.set(PARAMETRO.busqueda, busqueda)
  }

  if (criterios.estado !== CRITERIOS_POR_DEFECTO.estado) {
    params.set(PARAMETRO.estado, criterios.estado)
  }

  if (criterios.etiquetas.length > 0) {
    params.set(PARAMETRO.etiquetas, criterios.etiquetas.join(','))
  }

  if (criterios.orden !== CRITERIOS_POR_DEFECTO.orden) {
    params.set(PARAMETRO.orden, criterios.orden)
  }

  if (criterios.ordenDeEventos !== CRITERIOS_POR_DEFECTO.ordenDeEventos) {
    params.set(PARAMETRO.ordenDeEventos, criterios.ordenDeEventos)
  }

  if (criterios.ordenDeFichas !== CRITERIOS_POR_DEFECTO.ordenDeFichas) {
    params.set(PARAMETRO.ordenDeFichas, criterios.ordenDeFichas)
  }

  return params
}
