import type { AsignacionDeEtiqueta, EstadoDeProcesamiento, Ficha } from '../data'
import { fichasVisibles } from './acceso'
import type { ConferenciaVisible } from './acceso'

/*
  Filtrado, búsqueda y orden del listado del dashboard.

  Todo son funciones puras que reciben y devuelven listas, sin tocar React ni
  la URL. La pantalla solo traduce los controles a `CriteriosDeListado` y pinta
  el resultado, de modo que cada regla se puede probar sin montar nada.
*/

export type Segmento = 'todas' | 'propias' | 'compartidas'
export type OrdenDeListado = 'fecha-desc' | 'fecha-asc' | 'titulo-asc' | 'fichas-desc'
export type FiltroDeEstado = 'todos' | EstadoDeProcesamiento

export type CriteriosDeListado = {
  readonly segmento: Segmento
  readonly busqueda: string
  readonly estado: FiltroDeEstado
  /** Identificadores de etiqueta. Se exigen todas a la vez, no cualquiera. */
  readonly etiquetas: readonly string[]
  readonly orden: OrdenDeListado
}

export const CRITERIOS_POR_DEFECTO: CriteriosDeListado = {
  segmento: 'todas',
  busqueda: '',
  estado: 'todos',
  etiquetas: [],
  orden: 'fecha-desc',
}

/*
  Quita tildes y mayúsculas para comparar. Se usa tanto al buscar como al
  ordenar por título: si el alfabeto tratara "Anotación" distinto de
  "anotacion", el orden dependería de dónde cayeron los acentos.
*/
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function filtrarPorSegmento(
  visibles: readonly ConferenciaVisible[],
  segmento: Segmento,
): readonly ConferenciaVisible[] {
  if (segmento === 'todas') {
    return visibles
  }

  const procedencia = segmento === 'propias' ? 'propia' : 'compartida'

  return visibles.filter((visible) => visible.procedencia === procedencia)
}

/** Separa en palabras por cualquier tramo que no sea letra o número. */
function palabrasDe(texto: string): readonly string[] {
  return texto.split(/[^a-z0-9]+/).filter((palabra) => palabra.length > 0)
}

/*
  Busca sobre título, ponente y evento por inicio de palabra, no por
  subcadena. Con subcadena sin límites, buscar "IA" encontraba cualquier
  conferencia cuyo ponente se llamara "Mariana" o "Lucía", o cuyo evento
  mencionara "Ingeniería": "ia" aparece a mitad de esas palabras sin que
  tengan nada que ver con lo que se buscaba. Coincidir por inicio de palabra
  evita esos falsos positivos y conserva la búsqueda incremental de siempre
  ("algorit" sigue encontrando "algorítmicos" mientras se escribe).

  Con varias palabras en la búsqueda, cada una se exige por separado (todas a
  la vez, en cualquier orden): así "revision sistematica" encuentra el título
  aunque las palabras no aparezcan pegadas de esa forma exacta en el texto.
*/
export function buscar(
  visibles: readonly ConferenciaVisible[],
  texto: string,
): readonly ConferenciaVisible[] {
  const palabrasBuscadas = palabrasDe(normalizarTexto(texto))

  if (palabrasBuscadas.length === 0) {
    return visibles
  }

  return visibles.filter((visible) => {
    const { titulo, ponente, evento } = visible.conferencia
    const palabrasDelTexto = palabrasDe(normalizarTexto(`${titulo} ${ponente} ${evento}`))

    return palabrasBuscadas.every((buscada) =>
      palabrasDelTexto.some((palabra) => palabra.startsWith(buscada)),
    )
  })
}

export function filtrarPorEstado(
  visibles: readonly ConferenciaVisible[],
  estado: FiltroDeEstado,
): readonly ConferenciaVisible[] {
  if (estado === 'todos') {
    return visibles
  }

  return visibles.filter((visible) => visible.conferencia.estado === estado)
}

/*
  Intersección y no unión: pedir "IA" y "art1" a la vez significa buscar lo que
  sirve para ese artículo Y trata de ese tema. La unión devolvería justo lo
  contrario de lo que se quiere al combinar dos etiquetas.
*/
export function filtrarPorEtiquetas(
  visibles: readonly ConferenciaVisible[],
  idsEtiqueta: readonly string[],
  asignaciones: readonly AsignacionDeEtiqueta[],
): readonly ConferenciaVisible[] {
  if (idsEtiqueta.length === 0) {
    return visibles
  }

  return visibles.filter((visible) =>
    idsEtiqueta.every((idEtiqueta) =>
      asignaciones.some(
        (asignacion) =>
          asignacion.idEtiqueta === idEtiqueta &&
          asignacion.idConferencia === visible.conferencia.id,
      ),
    ),
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

function compararPorCriterio(
  izquierda: ConferenciaVisible,
  derecha: ConferenciaVisible,
  orden: OrdenDeListado,
  conteoDeFichas: ReadonlyMap<string, number>,
): number {
  switch (orden) {
    case 'fecha-desc':
      return compararCadenas(
        derecha.conferencia.fechaDelEvento,
        izquierda.conferencia.fechaDelEvento,
      )
    case 'fecha-asc':
      return compararCadenas(
        izquierda.conferencia.fechaDelEvento,
        derecha.conferencia.fechaDelEvento,
      )
    case 'titulo-asc':
      return compararCadenas(
        normalizarTexto(izquierda.conferencia.titulo),
        normalizarTexto(derecha.conferencia.titulo),
      )
    case 'fichas-desc':
      return (
        (conteoDeFichas.get(derecha.conferencia.id) ?? 0) -
        (conteoDeFichas.get(izquierda.conferencia.id) ?? 0)
      )
  }
}

/*
  El desempate por código de charla no es cosmético: sin él, dos conferencias
  del mismo día quedarían en el orden en que llegaron, y la pantalla cambiaría
  sola entre recargas.

  El conteo de fichas se calcula con `fichasVisibles`, así que ordena por lo que
  esa persona ve y no por el total real.
*/
export function ordenar(
  visibles: readonly ConferenciaVisible[],
  orden: OrdenDeListado,
  fichas: readonly Ficha[],
): readonly ConferenciaVisible[] {
  const conteoDeFichas = new Map<string, number>()

  for (const visible of visibles) {
    conteoDeFichas.set(visible.conferencia.id, fichasVisibles(fichas, visible).length)
  }

  return [...visibles].sort((izquierda, derecha) => {
    const principal = compararPorCriterio(izquierda, derecha, orden, conteoDeFichas)

    if (principal !== 0) {
      return principal
    }

    return compararCadenas(izquierda.conferencia.codigoDeEvento, derecha.conferencia.codigoDeEvento)
  })
}

export type EntradaDeListado = {
  readonly visibles: readonly ConferenciaVisible[]
  readonly criterios: CriteriosDeListado
  readonly asignaciones: readonly AsignacionDeEtiqueta[]
  readonly fichas: readonly Ficha[]
}

/** Aplica los cinco criterios en orden y devuelve el listado tal como se pinta. */
export function listarConferencias(entrada: EntradaDeListado): readonly ConferenciaVisible[] {
  const { visibles, criterios, asignaciones, fichas } = entrada

  const filtradas = filtrarPorEtiquetas(
    filtrarPorEstado(
      buscar(filtrarPorSegmento(visibles, criterios.segmento), criterios.busqueda),
      criterios.estado,
    ),
    criterios.etiquetas,
    asignaciones,
  )

  return ordenar(filtradas, criterios.orden, fichas)
}
