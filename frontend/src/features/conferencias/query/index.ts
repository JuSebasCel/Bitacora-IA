/*
  Superficie pública de la capa de consulta: acceso, filtrado, orden y resumen.
  Todo lo que hay aquí son funciones puras sobre los datos del dominio, sin
  React de por medio, para que se puedan probar en aislamiento y para que la
  llegada del backend real no obligue a reescribir las reglas.
*/

export type { ConferenciaVisible, FichaDelCatalogo, Procedencia, ResultadoConferencia } from './acceso'
export {
  conferenciasVisibles,
  fichasDelCatalogo,
  fichasVisibles,
  obtenerConferencia,
  privacidadEfectiva,
} from './acceso'

export type {
  CriteriosDeListado,
  EntradaDeListado,
  FiltroDeEstado,
  OrdenDeListado,
  Segmento,
} from './filtros'
export {
  CRITERIOS_POR_DEFECTO,
  buscar,
  filtrarPorEstado,
  filtrarPorEtiquetas,
  filtrarPorSegmento,
  listarConferencias,
  normalizarTexto,
  ordenar,
  palabrasDe,
} from './filtros'

export type { ConteoPorEstado, ConteoPorTipo, ResumenDeFichas } from './resumen'
export { resumirFichas } from './resumen'

export { escribirCriterios, leerCriterios } from './parametros'
