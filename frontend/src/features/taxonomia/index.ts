export type { Taxonomia, Tema, TemaActivoEnEvento, TemaPropuesto } from './data'
export { TAXONOMIA_DE_EJEMPLO, TEMAS_DE_EJEMPLO } from './data'
export type { ResultadoDeTaxonomia } from './taxonomia'
export { aprobarPropuesta, nombreDeTema, rechazarPropuesta } from './taxonomia'
export {
  aprobarPropuestaRemota,
  leerTaxonomiaRemota,
  rechazarPropuestaRemota,
} from './repositorio'
export type { ResultadoDeAccion, ValorDeTaxonomia, ValorDeTemas } from './useTaxonomia'
export { useTaxonomia, useTemas } from './useTaxonomia'
