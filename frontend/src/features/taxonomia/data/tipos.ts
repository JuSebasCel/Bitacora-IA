/*
  Tipos de la taxonomía de temas (F9).

  Viven aquí y no en `conferencias/data/tipos.ts` por la misma razón que los
  de `plantillas` y `memorias` viven en su propio dominio: la taxonomía la
  administra el rol Administrador, no es parte del recorrido de una
  conferencia. `Ficha` solo guarda el id como cadena, así que no necesita
  importar nada de aquí y los dos dominios quedan sin acoplarse.

  Traduce a TypeScript lo que `PLAN.md` sección 3.1 especifica: taxonomía
  controlada, definida por evento, sobre un pool reutilizable entre eventos,
  con revisión de un curador antes de que un tema nuevo entre al pool.
*/

/** Tema del pool general, reutilizable entre eventos. */
export type Tema = {
  readonly id: string
  readonly nombre: string
}

/*
  Qué temas del pool están activos para un evento concreto. Es una relación
  aparte y no un arreglo dentro de `Tema` porque el mismo tema participa en
  varios eventos, y lo que cambia entre ellos es la selección, no el tema.
*/
export type TemaActivoEnEvento = {
  readonly idEvento: string
  readonly idTema: string
}

/*
  Tema que el análisis de discurso propuso al procesar una charla y que
  todavía no entra al pool general.

  Existe para frenar los duplicados con nombres distintos ("sesgos en IA"
  contra "discriminación algorítmica"), que es exactamente lo que el paso de
  curaduría de `PLAN.md` 3.1 previene: si el vocabulario se dispersa, se
  pierde la comparabilidad entre eventos que justifica toda la taxonomía.
*/
export type TemaPropuesto = {
  readonly id: string
  readonly nombre: string
  readonly idEvento: string
  /** Fecha ISO en que el procesamiento lo propuso. */
  readonly propuestoEl: string
  /** Por qué el clasificador consideró que ninguno de los activos encajaba. */
  readonly justificacion: string
}

/** Todo lo que administra el módulo, junto: es lo que se guarda y se lee de una vez. */
export type Taxonomia = {
  readonly temas: readonly Tema[]
  readonly activos: readonly TemaActivoEnEvento[]
  readonly propuestas: readonly TemaPropuesto[]
}

export const TAXONOMIA_VACIA: Taxonomia = {
  temas: [],
  activos: [],
  propuestas: [],
}
