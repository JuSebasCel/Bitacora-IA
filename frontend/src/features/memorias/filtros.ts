import { normalizarTexto, palabrasDe } from '@/features/conferencias/query'
import type { Memoria } from './data'

/*
  Filtrado y búsqueda del listado de memorias (F5): mismo esqueleto que
  `catalogo/filtros.ts` (que a su vez sigue a `conferencias/query/filtros.ts`),
  funciones puras, sin React ni URL, para que la pantalla solo traduzca los
  controles a `CriteriosDeMemorias` y pinte el resultado.

  Por ahora el único criterio es la búsqueda, así que la forma es más chica
  que la del catálogo, pero se mantiene el mismo patrón (`CRITERIOS_POR_
  DEFECTO`, `listarMemorias` como punto de entrada único) para que agregar un
  filtro más adelante (por plantilla, por ejemplo) sea coherente con el resto
  de la app.
*/

/**
 * Una memoria junto con el nombre de su conferencia y su plantilla de
 * origen, que es lo que la persona ve en la tarjeta del listado y por lo
 * que tiene sentido buscar (`TarjetaDeMemoria.tsx`).
 */
export type EntradaDeMemoria = {
  readonly memoria: Memoria
  readonly nombreConferencia: string
  readonly nombrePlantilla: string
}

export type CriteriosDeMemorias = {
  readonly busqueda: string
}

export const CRITERIOS_POR_DEFECTO: CriteriosDeMemorias = {
  busqueda: '',
}

/*
  Mismo emparejamiento por inicio de palabra que `buscar` de conferencias y
  `buscarEnCatalogo`, reutilizando `normalizarTexto`/`palabrasDe` de
  `conferencias/query` para no arriesgar reintroducir el bug de subcadena que
  ese archivo ya documentó y corrigió.
*/
export function buscarMemorias(
  entradas: readonly EntradaDeMemoria[],
  texto: string,
): readonly EntradaDeMemoria[] {
  const palabrasBuscadas = palabrasDe(normalizarTexto(texto))

  if (palabrasBuscadas.length === 0) {
    return entradas
  }

  return entradas.filter((entrada) => {
    const palabrasDelTexto = palabrasDe(
      normalizarTexto(`${entrada.memoria.nombre} ${entrada.nombreConferencia} ${entrada.nombrePlantilla}`),
    )

    return palabrasBuscadas.every((buscada) => palabrasDelTexto.some((palabra) => palabra.startsWith(buscada)))
  })
}

export type EntradaDeListadoDeMemorias = {
  readonly entradas: readonly EntradaDeMemoria[]
  readonly criterios: CriteriosDeMemorias
}

/** Punto de entrada único: aplica los criterios en orden y devuelve el listado tal como se pinta. */
export function listarMemorias(entrada: EntradaDeListadoDeMemorias): readonly EntradaDeMemoria[] {
  return buscarMemorias(entrada.entradas, entrada.criterios.busqueda)
}
