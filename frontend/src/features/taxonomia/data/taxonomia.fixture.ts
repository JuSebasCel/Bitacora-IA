import type { Taxonomia, Tema, TemaActivoEnEvento, TemaPropuesto } from './tipos'

/*
  Semilla de la taxonomía: los once temas que ya usaban `fichas.fixture.ts`
  (nueve) y `conferencias.fixture.ts` (dos más, de conferencias que todavía
  no produjeron fichas). Antes de F9 eran cadenas sueltas repetidas en cada
  ficha; aquí pasan a ser el pool general del que todo lo demás depende.

  Los ids son estables y legibles a propósito: viajan en la URL del catálogo
  al filtrar por tema, y un id opaco haría ilegible un enlace compartido.

  Se borra cuando entre B4 y la taxonomía real viva en Supabase.
*/

export const TEMAS_DE_EJEMPLO: readonly Tema[] = [
  { id: 'tem-analitica-predictiva', nombre: 'Analítica predictiva' },
  { id: 'tem-calidad-de-datos', nombre: 'Calidad de datos' },
  { id: 'tem-etica-y-automatizacion', nombre: 'Ética y automatización' },
  { id: 'tem-gobernanza-de-datos', nombre: 'Gobernanza de datos' },
  { id: 'tem-infraestructura-de-investigacion', nombre: 'Infraestructura de investigación' },
  { id: 'tem-metodos-de-investigacion', nombre: 'Métodos de investigación' },
  { id: 'tem-modelos-de-lenguaje', nombre: 'Modelos de lenguaje' },
  { id: 'tem-participacion-ciudadana', nombre: 'Participación ciudadana' },
  { id: 'tem-reproducibilidad', nombre: 'Reproducibilidad' },
  { id: 'tem-sensorica-ambiental', nombre: 'Sensórica ambiental' },
  { id: 'tem-sesgos-algoritmicos', nombre: 'Sesgos algorítmicos' },
]

/*
  Qué temas quedaron activos en cada evento. No son los once en todos: eso es
  justamente lo que la taxonomía por evento permite decir, y lo que hace que
  la pantalla de administración tenga algo que administrar.

  Se corresponde con los temas que de verdad aparecen en las conferencias de
  cada evento en el fixture, más alguno vecino que el administrador dejaría
  disponible por si aparece.
*/
export const TEMAS_ACTIVOS_DE_EJEMPLO: readonly TemaActivoEnEvento[] = [
  /* Simposio Andino de Investigación Aplicada. */
  { idEvento: 'evt-saia', idTema: 'tem-modelos-de-lenguaje' },
  { idEvento: 'evt-saia', idTema: 'tem-calidad-de-datos' },
  { idEvento: 'evt-saia', idTema: 'tem-metodos-de-investigacion' },
  { idEvento: 'evt-saia', idTema: 'tem-gobernanza-de-datos' },
  { idEvento: 'evt-saia', idTema: 'tem-reproducibilidad' },

  /* Coloquio de Ciencia de Datos del Norte. */
  { idEvento: 'evt-ccdn', idTema: 'tem-sesgos-algoritmicos' },
  { idEvento: 'evt-ccdn', idTema: 'tem-calidad-de-datos' },
  { idEvento: 'evt-ccdn', idTema: 'tem-analitica-predictiva' },
  { idEvento: 'evt-ccdn', idTema: 'tem-modelos-de-lenguaje' },

  /* Jornadas de Ingeniería y Sociedad. */
  { idEvento: 'evt-jis', idTema: 'tem-sensorica-ambiental' },
  { idEvento: 'evt-jis', idTema: 'tem-participacion-ciudadana' },
  { idEvento: 'evt-jis', idTema: 'tem-infraestructura-de-investigacion' },
  { idEvento: 'evt-jis', idTema: 'tem-etica-y-automatizacion' },
]

/*
  Propuestas pendientes de curaduría. Están puestas a propósito para que la
  cola no nazca vacía y se vea el caso que motiva todo el mecanismo: las dos
  primeras nombran cosas que el pool ya cubre con otras palabras, y son las
  que un curador rechazaría en vez de aceptar.
*/
export const PROPUESTAS_DE_EJEMPLO: readonly TemaPropuesto[] = [
  {
    id: 'prop-sesgos-en-ia',
    nombre: 'Sesgos en IA',
    idEvento: 'evt-ccdn',
    propuestoEl: '2026-05-16',
    justificacion:
      'Tres fichas hablan de discriminación producida por el modelo, no por el registro de origen.',
  },
  {
    id: 'prop-datos-sucios',
    nombre: 'Datos sucios',
    idEvento: 'evt-saia',
    propuestoEl: '2026-03-14',
    justificacion: 'Aparece repetido en la charla como categoría propia, distinta de la medición de calidad.',
  },
  {
    id: 'prop-consentimiento-informado',
    nombre: 'Consentimiento informado',
    idEvento: 'evt-jis',
    propuestoEl: '2025-10-09',
    justificacion: 'Ninguno de los temas activos del evento cubre la discusión sobre permisos de uso de datos.',
  },
]

export const TAXONOMIA_DE_EJEMPLO: Taxonomia = {
  temas: TEMAS_DE_EJEMPLO,
  activos: TEMAS_ACTIVOS_DE_EJEMPLO,
  propuestas: PROPUESTAS_DE_EJEMPLO,
}
