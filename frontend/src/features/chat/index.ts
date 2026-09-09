export type {
  AlcanceDeConsulta,
  Conversacion,
  Mensaje,
  MensajeDeAclaracion,
  MensajeDeRespuesta,
  MensajeDeUsuario,
  MensajeNuevo,
  OpcionDeAclaracion,
  PasoDeRazonamiento,
} from './data/tipos'
export { CANTIDAD_POR_DEFECTO, extraerCantidadSolicitada, limiteDe } from './cantidad'
export type { CantidadSolicitada } from './cantidad'
export { comandoDeEtiquetaEn, idsDeConferenciasCitadas } from './etiquetar'
export { evaluarPregunta } from './generarRespuesta'
export type { ResultadoDeEvaluacion } from './generarRespuesta'
/*
  El contrato de generación es superficie pública del dominio: es lo que el
  backend conversacional tendrá que satisfacer. El repositorio, en cambio, no
  se exporta — hablar con las tablas del chat es asunto interno, y quien está
  fuera del dominio pasa por `useChat`.
*/
export { construirGenerador, generadorSimulado, mensajeNuevoDeEvaluacion } from './fronteraDeGeneracion'
export type { CatalogoParaGenerar, GeneradorDeRespuesta, PeticionDeGeneracion } from './fronteraDeGeneracion'
export { generacionCompleta, textoVisibleDe } from './progreso'
export type { EstadoDeGeneracion, ResultadoDeAccion, ValorDeChat } from './useChat'
export { useChat } from './useChat'
