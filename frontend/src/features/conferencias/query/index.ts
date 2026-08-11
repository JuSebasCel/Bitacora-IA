/*
  Superficie pública de la capa de consulta: acceso, filtrado, orden y resumen.
  Todo lo que hay aquí son funciones puras sobre los datos del dominio, sin
  React de por medio, para que se puedan probar en aislamiento y para que la
  llegada del backend real no obligue a reescribir las reglas.
*/

export type { ConferenciaVisible, Procedencia, ResultadoConferencia } from './acceso'
export {
  conferenciasVisibles,
  fichasVisibles,
  obtenerConferencia,
  privacidadEfectiva,
} from './acceso'
