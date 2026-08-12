/*
  Superficie pública de la capa de datos del dominio de plantillas. El resto
  del módulo importa desde aquí y no desde los archivos sueltos.
*/

export type {
  CampoDeMarcador,
  ElementoDeImagen,
  ElementoDeMarcador,
  ElementoDePlantilla,
  ElementoDeTexto,
  FormatoDeMarcador,
  Plantilla,
  Rectangulo,
  RolDeTexto,
} from './tipos'

export { CAMPOS_DE_MARCADOR, DATOS_DE_EJEMPLO, ETIQUETAS_DE_CAMPO } from './campos'
export { PLANTILLAS_DE_EJEMPLO } from './plantillas.fixture'
