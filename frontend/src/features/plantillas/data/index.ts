/*
  Superficie pública de la capa de datos del dominio de plantillas. El resto
  del módulo importa desde aquí y no desde los archivos sueltos.
*/

export type {
  CampoDeMarcador,
  FormatoDeMarcador,
  JSONContent,
  MarcadorDeDocx,
  MarcadorDeSeccionDeDocx,
  MarcadorSimpleDeDocx,
  ModoDeSeccion,
  OrigenDeMarcador,
  Plantilla,
  PlantillaDesdeDocx,
  PlantillaEnBlanco,
} from './tipos'

export {
  CAMPOS_DE_MARCADOR,
  DATOS_DE_EJEMPLO,
  ETIQUETAS_DE_CAMPO,
  ETIQUETAS_DE_FORMATO,
  ETIQUETAS_DE_MODO_DE_SECCION,
  etiquetaDeOrigen,
  resolverCondicionDeMarcador,
  resolverListaDeMarcador,
  resolverMarcador,
} from './campos'
export { PLANTILLAS_DE_EJEMPLO } from './plantillas.fixture'
