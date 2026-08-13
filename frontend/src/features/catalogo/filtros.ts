import type { EstadoDeValidacion, TipoDeUnidad } from '@/features/conferencias/data'
import { normalizarTexto, palabrasDe } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'

/*
  Filtrado, búsqueda y orden del catálogo (F6): las fichas de todas las
  conferencias visibles para una persona, no solo una. Mismo esqueleto que
  `conferencias/query/filtros.ts` — funciones puras, sin React ni URL, para
  que la pantalla solo traduzca los controles a `CriteriosDeCatalogo` y
  pinte el resultado.

  A diferencia de las etiquetas de F2 (una colección, se exigen todas a la
  vez), tema/tipo/evento/estado son "acotar a este uno" — de ahí que cada
  criterio sea un único valor o `null`/`'todos'`, no un arreglo.

  El pool de temas (F9) entra siempre por parámetro y nunca por import: este
  archivo se prueba con temas inventados y no debe depender de que exista un
  fixture concreto ni de lo que haya guardado la administración.
*/

export type FiltroDeEstadoDeValidacion = 'todos' | EstadoDeValidacion

export type CriteriosDeCatalogo = {
  readonly busqueda: string
  /** Id del tema (`tem-...`), no su nombre: el nombre puede cambiar sin que cambie el filtro. */
  readonly idTema: string | null
  readonly tipoDeUnidad: TipoDeUnidad | null
  readonly evento: string | null
  readonly estado: FiltroDeEstadoDeValidacion
}

export const CRITERIOS_POR_DEFECTO: CriteriosDeCatalogo = {
  busqueda: '',
  idTema: null,
  tipoDeUnidad: null,
  evento: null,
  estado: 'todos',
}

/*
  Busca sobre la ficha (fragmento, tema) y también sobre la conferencia de
  origen (título, ponente, evento): el catálogo cruza fichas de charlas
  distintas, así que de qué charla viene una ficha es justo lo que distingue
  una entrada de otra, y quedarse solo con el contenido de la ficha deja
  fuera la mitad de lo que alguien recordaría para encontrarla.

  Mismo emparejamiento por inicio de palabra que `buscar` de conferencias
  (`conferencias/query/filtros.ts`), reutilizando `normalizarTexto`/
  `palabrasDe` de ahí para no arriesgar reintroducir el bug de subcadena que
  ese archivo ya documentó y corrigió.

  Necesita el pool de temas porque la ficha solo guarda el id: buscar sobre
  `tem-sesgos-algoritmicos` en vez de sobre "Sesgos algorítmicos" haría que
  escribir el tema tal como se ve en pantalla no encontrara nada.
*/
export function buscarEnCatalogo(
  entradas: readonly FichaDelCatalogo[],
  texto: string,
  temas: readonly Tema[],
): readonly FichaDelCatalogo[] {
  const palabrasBuscadas = palabrasDe(normalizarTexto(texto))

  if (palabrasBuscadas.length === 0) {
    return entradas
  }

  return entradas.filter((entrada) => {
    const palabrasDelTexto = palabrasDe(
      normalizarTexto(
        `${entrada.ficha.fragmento} ${nombreDeTema(temas, entrada.ficha.idTema)} ${entrada.conferencia.titulo} ${entrada.conferencia.ponente} ${entrada.conferencia.evento}`,
      ),
    )

    return palabrasBuscadas.every((buscada) => palabrasDelTexto.some((palabra) => palabra.startsWith(buscada)))
  })
}

/*
  Compara por id y no por nombre: dos fichas clasificadas con el mismo tema
  siguen filtrándose juntas aunque la administración lo renombre después.
*/
export function filtrarPorTema(
  entradas: readonly FichaDelCatalogo[],
  idTema: string | null,
): readonly FichaDelCatalogo[] {
  if (idTema === null) {
    return entradas
  }

  return entradas.filter((entrada) => entrada.ficha.idTema === idTema)
}

export function filtrarPorTipoDeUnidad(
  entradas: readonly FichaDelCatalogo[],
  tipoDeUnidad: TipoDeUnidad | null,
): readonly FichaDelCatalogo[] {
  if (tipoDeUnidad === null) {
    return entradas
  }

  return entradas.filter((entrada) => entrada.ficha.tipoDeUnidad === tipoDeUnidad)
}

export function filtrarPorEvento(
  entradas: readonly FichaDelCatalogo[],
  evento: string | null,
): readonly FichaDelCatalogo[] {
  if (evento === null) {
    return entradas
  }

  return entradas.filter((entrada) => entrada.conferencia.evento === evento)
}

export function filtrarPorEstado(
  entradas: readonly FichaDelCatalogo[],
  estado: FiltroDeEstadoDeValidacion,
): readonly FichaDelCatalogo[] {
  if (estado === 'todos') {
    return entradas
  }

  return entradas.filter((entrada) => entrada.ficha.estadoDeValidacion === estado)
}

/*
  Temas distintos ya presentes en lo que esa persona puede ver — nunca el pool
  completo. Devuelve el tema entero y no su id porque quien lo pinta necesita
  las dos mitades a la vez: el nombre para mostrarlo y el id para filtrar.

  Un id que ya no esté en el pool (tema retirado tras clasificar la ficha)
  sigue apareciendo con el nombre que `nombreDeTema` le dé, en vez de
  desaparecer y dejar fichas imposibles de acotar desde el panel.
*/
export function temasDisponibles(
  entradas: readonly FichaDelCatalogo[],
  temas: readonly Tema[],
): readonly Tema[] {
  const idsPresentes = [...new Set(entradas.map((entrada) => entrada.ficha.idTema))]

  return idsPresentes
    .map((idTema) => ({ id: idTema, nombre: nombreDeTema(temas, idTema) }))
    .sort((izquierda, derecha) => izquierda.nombre.localeCompare(derecha.nombre))
}

/** Eventos distintos ya presentes en lo que esa persona puede ver. */
export function eventosDisponibles(entradas: readonly FichaDelCatalogo[]): readonly string[] {
  return [...new Set(entradas.map((entrada) => entrada.conferencia.evento))].sort((izquierda, derecha) =>
    izquierda.localeCompare(derecha),
  )
}

function compararCadenas(izquierda: string, derecha: string): number {
  if (izquierda < derecha) {
    return -1
  }

  if (izquierda > derecha) {
    return 1
  }

  return 0
}

/*
  Orden por defecto: conferencia más reciente primero, y dentro de la misma
  conferencia, en el orden en que la ficha aparece en la charla. El código de
  evento desempata dos conferencias del mismo día, igual que en el dashboard
  de F2 — sin desempate, el orden dependería de en qué posición llegaron los
  datos y cambiaría solo entre recargas.
*/
export function ordenarCatalogo(entradas: readonly FichaDelCatalogo[]): readonly FichaDelCatalogo[] {
  return [...entradas].sort((izquierda, derecha) => {
    const porFecha = compararCadenas(derecha.conferencia.fechaDelEvento, izquierda.conferencia.fechaDelEvento)
    if (porFecha !== 0) {
      return porFecha
    }

    const porCodigo = compararCadenas(izquierda.conferencia.codigoDeEvento, derecha.conferencia.codigoDeEvento)
    if (porCodigo !== 0) {
      return porCodigo
    }

    return izquierda.ficha.segundoInicio - derecha.ficha.segundoInicio
  })
}

export type EntradaDeListadoDeCatalogo = {
  readonly entradas: readonly FichaDelCatalogo[]
  readonly criterios: CriteriosDeCatalogo
  /** Pool de temas con el que resolver el nombre al buscar por palabra clave. */
  readonly temas: readonly Tema[]
}

/** Aplica los cinco criterios en orden y devuelve el catálogo tal como se pinta. */
export function listarCatalogo(entrada: EntradaDeListadoDeCatalogo): readonly FichaDelCatalogo[] {
  const { entradas, criterios, temas } = entrada

  const filtradas = filtrarPorEstado(
    filtrarPorEvento(
      filtrarPorTipoDeUnidad(
        filtrarPorTema(buscarEnCatalogo(entradas, criterios.busqueda, temas), criterios.idTema),
        criterios.tipoDeUnidad,
      ),
      criterios.evento,
    ),
    criterios.estado,
  )

  return ordenarCatalogo(filtradas)
}
